// src/api/fastapi.js
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

/*  POST /load-nomenclature  –   trimite nomenclatorul + vânzările  */
export const uploadNomenclature = (nomFile, salesFile) => {
  const formData = new FormData();
  formData.append("nomenclature", nomFile);   // trebuie să fie exact acelaşi key
  formData.append("sales",        salesFile); // ca în backend

  return axios.post(`${BASE_URL}/load-nomenclature`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/* apel existent */
export const predictSubstitutes = (productId) =>
  axios.get(`${BASE_URL}/predict/${productId}`);

/* căutare produse după nume */
export const searchProducts = (query) =>
  axios.get(`${BASE_URL}/search-products/${encodeURIComponent(query)}`);
