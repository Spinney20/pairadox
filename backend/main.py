from fastapi import FastAPI, UploadFile, File, HTTPException
import pandas as pd
import re
import math
from io import BytesIO
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import traceback
import logging

DATA_DIR = os.getenv("DATA_DIR", "data")

logger = logging.getLogger("uvicorn.error")

from datetime import datetime
from difflib import SequenceMatcher

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # sau specific "http://localhost:5173"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storages
tree = {}
product_index = {}     # folosit pentru predictii (tuplu)
product_details = {}   # folosit pentru afisarea completa (dictionar)
historical_subs = {}
train_count = {}

# Calea fisierului nomenclator local
LOCAL_NOMENCLATURE_FILE = os.path.join(DATA_DIR, "nomenclature.xlsx")
LOCAL_SALES_FILE        = os.path.join(DATA_DIR, "sales.xlsx")

########################################
# Nomenclature Loading Logic
########################################

def load_nomenclature(nom_path: str, sales_path: str):
    global tree, product_index, product_details

    # 0️⃣  citeste fisierele
    df_nom   = pd.read_excel(nom_path)
    df_nom.columns = df_nom.columns.str.strip()  # scoate spatiile

    df_sales = pd.read_excel(sales_path)
    df_sales.columns = df_sales.columns.str.strip()

    # detecteaza coloana cu "price"
    price_col = next(c for c in df_sales.columns if "price" in c.lower())

    df_sales = (
        df_sales.groupby("product_id")[price_col]
        .mean()
        .rename("price")
    )

    # standardizeaza header-ele nomenclatorului
    df_nom = df_nom.rename(columns={
        "ARTICLE_CODE_CUG": "ID",
        "ARTICLE_NAME":     "Articol",
        "MARKET_NAME":      "Piata",
        "SEGMENT_NAME":     "Segment",
        "CATEGORY_NAME":    "Categorie",
        "FAMILY_NAME":      "Familie",
        "Tip_Produs":       "Provenienta",
        "Brand":            "Brand"
    })

    df_nom["ID"] = pd.to_numeric(df_nom["ID"], errors="coerce")
    df_nom       = df_nom.dropna(subset=["ID"])
    df_nom["ID"] = df_nom["ID"].astype(int)

    # ataseaza pretul mediu
    df_nom["Pret"] = df_nom["ID"].map(df_sales).fillna(0)

    # reconstruieste structurile globale
    tree, product_index, product_details = {}, {}, {}

    for _, row in df_nom.iterrows():
        pid  = int(row["ID"])
        name = row["Articol"].strip()

        market   = row["Piata"].strip()
        segment  = row["Segment"].strip()
        category = row["Categorie"].strip()
        family   = row["Familie"].strip()
        price    = float(row["Pret"])
        origin   = str(row["Provenienta"]).strip()
        brand    = str(row["Brand"]).strip()

        tree.setdefault(market, {}).setdefault(segment, {}) \
            .setdefault(category, {}).setdefault(family, []).append(pid)

        # tuplul are acum 8 pozitii, dar fara „premium”
        product_index[pid] = (
            market, segment, category, family, brand, price, origin, name
        )

        product_details[pid] = {
            "ID": pid, "Articol": name, "Piata": market, "Segment": segment,
            "Categorie": category, "Familie": family, "Pret": price,
            "Provenienta": origin, "Brand": brand
        }

# La startup, daca fisierul nomenclator exista local, il incarcam
if os.path.exists(LOCAL_NOMENCLATURE_FILE) and os.path.exists(LOCAL_SALES_FILE):
    try:
        load_nomenclature(LOCAL_NOMENCLATURE_FILE, LOCAL_SALES_FILE)
        print("Nomenclator + sales incarcate de pe disc.")
    except Exception as e:
        print("Eroare la incarcarea fisierelor locale:", e)
else:
    print("Nu exista inca ambele fisiere. Asteptam upload-ul.")

@app.post("/load-nomenclature")
async def api_load_nomenclature(
        nomenclature: UploadFile = File(...),
        sales: UploadFile = File(...)):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)

        nom_path   = os.path.join(DATA_DIR, "nomenclature.xlsx")
        sales_path = os.path.join(DATA_DIR, "sales.xlsx")

        # salveaza fisierele uploadate
        with open(nom_path, "wb") as buff:
            shutil.copyfileobj(nomenclature.file, buff)
        with open(sales_path, "wb") as buff:
            shutil.copyfileobj(sales.file, buff)

        # proceseaza
        load_nomenclature(nom_path, sales_path)

        return {"message": "Nomenclature + sales loaded!"}

    except Exception as e:
        # 1️⃣  logheaza stack-trace-ul complet in consola
        logger.error("Eroare la /load-nomenclature\n" + traceback.format_exc())

        # 2️⃣  raspuns HTTP 500 cu detaliu (front-end il primeste in .response.data)
        raise HTTPException(status_code=500, detail=str(e))

########################################
# Prediction Logic
########################################

def compute_price_score(base_price, candidate_price):
    if base_price == 0:
        return 0
    ratio = candidate_price / base_price
    if ratio <= 0.25 or ratio >= 2:
        return 0
    elif 0.25 < ratio <= 1:
        return 40 * ((ratio - 0.25) / 0.75)
    elif 1 < ratio < 2:
        return 40 * ((2 - ratio) / 1)
    return 0

def name_similarity(a: str, b: str) -> float:
    """Returneaza intre 0 si 10, proportional cu similitudinea celor doua string-uri."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() * 10

def compute_confidence(pA, cand):
    _, _, _, famA, brandA, priceA, originA, nameA = product_index[pA]
    _, _, _, famC, brandC, priceC, originC, nameC = product_index[cand]

    price_score  = compute_price_score(priceA, priceC)        # max 40
    brand_score  = 40 if brandA == brandC else 0              # max 40
    origin_score = 10 if originA == originC else 0            # max 10
    name_score   = name_similarity(nameA, nameC)              # max 10

    attr_total      = price_score + brand_score + origin_score + name_score
    attr_multiplier = 1.0 if famA == famC else 0.6            # –40 % fallback
    attribute_conf  = attr_total * attr_multiplier

    real_conf  = 100 if (pA, cand) in historical_subs else 0
    train_days = train_count.get(pA, 0)
    alpha      = min(0.5 + 0.5 * (train_days - 1), 1.0) if train_days > 0 else 0.0

    return attribute_conf * (1 - alpha) + real_conf * alpha

def softmax_confidences(confidences, temperature=20):
    exps = {cand: math.exp(score / temperature) for cand, score in confidences.items()}
    total = sum(exps.values())
    return {cand: (exps[cand] / total) * 100 if total > 0 else 0 for cand in exps}

def get_substitutes_with_confidence(product_code):
    mar, seg, cat, fam, brand, price, origin, _ = product_index[product_code]
    family_candidates = [p for p in tree[mar][seg][cat][fam] if p != product_code]

    category_candidates = []
    for f_key, products in tree[mar][seg][cat].items():
        if f_key != fam:
            category_candidates.extend(
                [p for p in products if product_index[p][4] == brand]
            )

    substitutes = list(set(family_candidates + category_candidates))
    confidences = {cand: compute_confidence(product_code, cand) for cand in substitutes}
    return substitutes, confidences

@app.get("/predict/{product_id}")
def predict(product_id: int):
    try:
        if product_id not in product_index:
            return {"error": "Product not found"}
        substitutes, confidences = get_substitutes_with_confidence(product_id)
        probabilities = softmax_confidences(confidences)

        details = {
            pid: product_details[pid]
            for pid in [product_id] + substitutes
            if pid in product_details
        }

        return {
            "product_id": product_id,
            "substitutes": substitutes,
            "confidences": confidences,
            "probabilities": probabilities,
            "product_details": details
        }
    except Exception as e:
        return {"error": str(e)}

########################################
# Training Logic
########################################

@app.post("/train/")
def train_model(data: dict):
    global historical_subs, train_count

    product_out_id = data["product_out_id"]
    zero_stock_data = data["zero_stock_data"]

    for entry in zero_stock_data:
        real_sub = entry["real_sub"]
        key = (product_out_id, real_sub)
        historical_subs[key] = historical_subs.get(key, 0) + 1
        train_count[product_out_id] = train_count.get(product_out_id, 0) + 1

    return {"message": f"Trained product {product_out_id}"}

########################################
# Nomenclature Info and Clear Endpoints
########################################

@app.get("/nomenclature-info")
def nomenclature_info():
    if os.path.exists(LOCAL_NOMENCLATURE_FILE):
        # Obtine timestamp-ul ultimei modificari
        last_upload_ts = os.path.getmtime(LOCAL_NOMENCLATURE_FILE)
        last_upload = datetime.fromtimestamp(last_upload_ts).strftime("%Y-%m-%d %H:%M:%S")
        # Numarul de produse, folosind datele incarcate in memorie
        product_count = len(product_details)  # sau len(product_index)
        # Construim un array de obiecte cu toata informatia
        products_list = list(product_details.values())

        return {
            "exists": True,
            "lastUpload": last_upload,
            "productCount": product_count,
            "products": products_list
        }
    else:
        return {"exists": False}

@app.delete("/clear-nomenclature")
def clear_nomenclature():
    if os.path.exists(LOCAL_NOMENCLATURE_FILE):
        try:
            os.remove(LOCAL_NOMENCLATURE_FILE)
            # Resetam variabilele globale
            global tree, product_index, product_details
            tree = {}
            product_index = {}
            product_details = {}
            return {"message": "Nomenclature cleared successfully."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(status_code=404, detail="Nomenclature file not found.")

@app.get("/search-products/{query}")
def search_products(query: str):
    """
    Cauta produse dupa nume (case-insensitive, partial match).
    Intoarce o lista de produse (ID si nume) care se potrivesc cu query-ul.
    """
    if not product_details:
        raise HTTPException(status_code=404, detail="Nomenclature not loaded")

    query = query.lower()
    results = []

    for pid, details in product_details.items():
        product_name = details["Articol"].lower()
        if query in product_name:
            results.append({
                "id": pid,
                "name": details["Articol"]
            })

    # Sorteaza dupa relevanta
    results.sort(key=lambda x: (
        0 if x["name"].lower() == query else
        1 if x["name"].lower().startswith(query) else 2,
        len(x["name"])
    ))

    return {"results": results[:10]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
