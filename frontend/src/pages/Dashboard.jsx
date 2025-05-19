import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    Box, Heading, Text, Button, Input, HStack,
    Badge, Flex, VStack, Spinner, useToast,
    ScaleFade, Divider, Tooltip, Stat, StatLabel, StatNumber,
    Grid, GridItem, IconButton, Collapse,
    InputGroup, InputLeftElement, InputRightElement,
    List, ListItem
  } from "@chakra-ui/react";
import { predictSubstitutes, searchProducts } from "../api/fastapi";
import {
    PieChart, Pie, Tooltip as RechartsTooltip,
    ResponsiveContainer, Cell,
    BarChart, Bar,
    ComposedChart, Line,
    XAxis, YAxis, Legend
  } from "recharts";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiShoppingCart,
  FiBarChart2,
  FiPackage,
  FiTrendingUp,
  FiList,
  FiEye,
  FiEyeOff,
  FiPlusCircle,
  FiChevronRight,
  FiInfo,
  FiPieChart,
  FiAlertTriangle
} from "react-icons/fi";

// Motion component for Box
const MotionBox = motion(Box);

export default function Dashboard() {
  const [productId, setProductId] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSubsAll, setShowSubsAll] = useState(false);
  const [showAdjAll,  setShowAdjAll]  = useState(false);
  const [showInfoBox, setShowInfoBox] = useState(false);

  const [baseQty, setBaseQty]       = useState("");      // user input
  const [adjList, setAdjList]       = useState(null);    // [{ id,name,add }]
  const [adjError, setAdjError]     = useState("");      // validation msg

  // Search functionality states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const toast = useToast();

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search functionality
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setProductId(query); // Set productId if it's a valid number

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.trim().length >= 2) {
      setIsSearching(true);
      setShowDropdown(true);

      // Debounce search to avoid too many API calls
      searchTimeout.current = setTimeout(async () => {
        try {
          const response = await searchProducts(query);
          setSearchResults(response.data.results);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
    }
  };

  const handleSelectProduct = (product) => {
    setProductId(product.id.toString());
    setSearchQuery(product.id.toString()); // Display the ID in the search box
    setShowDropdown(false);
  };

const calcAdjustments = () => {
  const qty = parseInt(baseQty, 10);
  if (!qty || qty <= 0) {
    setAdjError("⚠️ Please enter a valid number greater than zero.");
    setAdjList(null);
    return;
  }
  setAdjError("");

  // use SAME filtering rule you already apply for showAll/hidden
  const subs   = displayedSubs;
  const result = subs.map((s) => ({
      id:   s,
      name: prediction.product_details[s]?.Articol || "Product",
      add:  Math.ceil((qty * prediction.probabilities[s]) / 100),
  }));
  setAdjList(result);

  toast({
    title: "Recommendations calculated",
    description: `Generated quantities for ${result.length} substitutes`,
    status: "success",
    duration: 3000,
    isClosable: true,
    position: "top"
  });
};

  // Palette for the pie slices
  const pieColors = [
    "#4F6BFF",
    "#36A2EB",
    "#65D6AD",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#00C49F",
    "#FF6384",
  ];

  // Fetch prediction from backend
  const handlePredict = async () => {
    if (!productId) {
      toast({
        title: "Missing product ID",
        description: "Please enter a product ID to continue",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top"
      });
      return;
    }

    try {
      setLoading(true);
      setShowSubsAll(false);
      setShowAdjAll(false);
      const res = await predictSubstitutes(productId);
      const data = res.data;

      // Check if the response contains an error
      if (data.error) {
        setPrediction({ error: data.error });
        toast({
          title: "Product not found",
          description: `Product ID ${productId} does not exist in the database`,
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top"
        });
      } else {
        setPrediction(data);
        setSearchQuery(productId); // Ensure search query matches the predicted product ID
        toast({
          title: "Prediction completed",
          description: "Substitute products have been analyzed",
          status: "success",
          duration: 3000,
          isClosable: true,
          position: "top"
        });
      }
    } catch (err) {
      setPrediction({ error: "❌ Prediction failed" });
      toast({
        title: "Prediction failed",
        description: "Unable to process the product ID",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top"
      });
    } finally {
      setLoading(false);
      setShowDropdown(false); // Hide dropdown after prediction
    }
  };

  /* ----------------------------------
   * Helpers: displayed vs hidden items
   * ---------------------------------- */
  const displayedSubs = useMemo(() => {
    if (!prediction || !prediction.substitutes) return [];
    const subs = prediction.substitutes;

    // Show all subs if explicitly toggled or if 3 or fewer total
    if (showSubsAll || subs.length <= 3) return subs;

    // Filter by thresholds
    const filteredSubs = subs.filter(
      sub =>
        prediction.confidences[sub] >= 40 &&
        prediction.probabilities[sub] > 10
    );

    // If we have 3 or more that pass the threshold, return those
    if (filteredSubs.length >= 3) return filteredSubs;

    // Otherwise, get the top 3 by probability regardless of threshold
    return subs
      .slice()
      .sort((a, b) => prediction.probabilities[b] - prediction.probabilities[a])
      .slice(0, 3);
  }, [prediction, showSubsAll]);

  const hiddenSubs = useMemo(() => {
    if (!prediction || !prediction.substitutes) return [];
    return prediction.substitutes.filter((sub) => !displayedSubs.includes(sub));
  }, [prediction, displayedSubs]);

  // Aggregate hidden items under "Others" / "Average Others"
  const othersConfidence = hiddenSubs.reduce(
    (acc, sub) => acc + (prediction?.confidences[sub] || 0),
    0
  );
  const othersProbability = hiddenSubs.reduce(
    (acc, sub) => acc + (prediction?.probabilities[sub] || 0),
    0
  );


  const avgOthersConfidence =
    hiddenSubs.length > 0 ? othersConfidence / hiddenSubs.length : 0;

  const displayedAdj = useMemo(() => {
      if (!adjList) return [];
      return showAdjAll ? adjList : adjList.slice(0, displayedSubs.length);
    }, [adjList, showAdjAll, displayedSubs.length]);

  /* --------------------
   * Chart datasets
   * -------------------- */
  const barData = displayedSubs.map((sub) => ({
    name: sub,
    value: prediction?.confidences[sub],
  }));
  // In the bar chart we show the *average* of hidden items, not the sum.
  if (hiddenSubs.length > 0)
    barData.push({ name: "Average Others", value: avgOthersConfidence });

  const pieData = displayedSubs.map((sub) => ({
    name: sub,
    value: prediction?.probabilities[sub],
  }));
  // In the pie chart we keep the cumulative probability of hidden items.
  if (othersProbability > 0)
    pieData.push({ name: "Others", value: othersProbability });

  const getColor = (idx, name) =>
    name === "Others" ? "#808080" : pieColors[idx % pieColors.length];


  /* -------------------- Chart datasets -------------------- */
  // Sort chartData by confidence for bar chart
  const chartData = useMemo(() => {
    if (!prediction || !prediction.substitutes || prediction.error) return [];

    return displayedSubs
      .slice() // Create a copy to avoid mutating the original array
      .sort((a, b) => prediction.confidences[b] - prediction.confidences[a])
      .map(sub => ({
        name: sub,
        confidence: prediction.confidences[sub],      // bar
        probability: prediction.probabilities[sub],   // line
      }));
  }, [prediction, displayedSubs]);

  // Add "Others" to chartData if needed
  useMemo(() => {
    if (!prediction || !prediction.substitutes || prediction.error || hiddenSubs.length === 0) return chartData;

    return [
      ...chartData,
      {
        name: "Average Others",
        confidence: avgOthersConfidence,
        probability: othersProbability / hiddenSubs.length,
      }
    ];
  }, [chartData, hiddenSubs, avgOthersConfidence, othersProbability, prediction]);

  // Date pentru pie chart-ul de cantități recomandate
  const prepareAdjPieData = () => {
    if (!adjList) return [];
    return adjList.map(item => ({
      name: item.name,
      value: item.add
    }));
  };

  // Create a custom rendering component for pie chart labels
  const renderCustomizedLabel = (props) => {
    const { cx, cy, midAngle, outerRadius, percent, index, name, fill } = props;

    // Calculate position for labels outside the pie
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2; // Reduced outer spacing
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Calculate if this slice is big enough to show label
    const percentValue = (percent * 100).toFixed(0);
    if (percentValue < 5) return null; // Don't show tiny slices' labels

    return (
      <g>
        {/* Connecting line from pie to label */}
        <path
          d={`M ${cx + outerRadius * 0.95 * Math.cos(-midAngle * RADIAN)},${cy + outerRadius * 0.95 * Math.sin(-midAngle * RADIAN)} L ${x},${y}`}
          stroke={fill || pieColors[index % pieColors.length]}
          fill="none"
          strokeWidth={1}
        />
        {/* Background for better readability */}
        <rect
          x={x - 14}
          y={y - 10}
          width={28}
          height={20}
          fill="rgba(0,0,0,0.5)"
          rx={4}
        />
        {/* Percentage text */}
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={11}
          fontWeight="bold"
        >{`${percentValue}%`}</text>
      </g>
    );
  };

  // Custom formatter pentru tooltip ca să afișeze doar 2 zecimale
  const customTooltipFormatter = (value) => {
    return `${parseFloat(value).toFixed(2)}%`;
  };

  // Custom formatter pentru tooltip-ul de la pie chart
  const adjTooltipFormatter = (value) => {
    return `${value} units`;
  };

  // Styled tooltip for all charts
  const tooltipStyle = {
    backgroundColor: "rgba(45, 55, 72, 0.9)",
    borderRadius: "8px",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
    padding: "8px"
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const productId = label;
      const productName = prediction.product_details?.[productId]?.Articol || "Product";

      return (
        <Box bg="gray.800" p={2} borderRadius="md" border="1px solid" borderColor="gray.600" maxW="250px">
          <Text fontWeight="bold" mb={1}>{productName}</Text>
          <Text fontSize="sm" color="gray.300">ID: {productId}</Text>
          <Divider my={1} />
          {payload.map((entry, index) => (
            <Text key={index} fontSize="sm" color={entry.stroke || entry.fill}>
              {entry.name}: {entry.value.toFixed(2)}%
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  const isPredicted = prediction && prediction.substitutes && !prediction.error;

  return (
    <Box flex="1" height="100%" p={5} overflowY="auto">
      {isPredicted ? (
        <Grid templateColumns="repeat(12, 1fr)" gap={3}>
          {/* Left column: results */}
          <GridItem colSpan={{ base: 12, lg: 8 }}>
            <ScaleFade initialScale={0.95} in={true}>
              <MotionBox
                bg="whiteAlpha.200"
                p={4}
                rounded="lg"
                shadow="md"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                height="855px"
                maxH="81vh"
                overflowY="auto"
                css={{
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(0,150,150,0.5)',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(0,150,150,0.7)',
                  },
                }}
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Heading size="md" color="teal.300" display="flex" alignItems="center">
                    <FiShoppingCart style={{ marginRight: '10px', strokeWidth: 2.5 }} />
                    <Text fontSize="xl">Substitutes for:&nbsp;</Text>
                    <Badge
                      bg="rgba(90,110,170,0.3)"
                      color="white"
                      p={1.5}
                      borderRadius="md"
                      fontWeight="500"
                      ml={2}
                    >
                      {prediction.product_details?.[prediction.product_id]?.Articol || `ID ${prediction.product_id}`}
                    </Badge>
                  </Heading>

                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="teal"
                    color="teal.300"
                    borderColor="teal.300"
                    leftIcon={showInfoBox ? <FiEyeOff /> : <FiInfo />}
                    onClick={() => setShowInfoBox(!showInfoBox)}
                    fontSize="sm"
                    transition="all 0.3s"
                    _hover={{ bg: "rgba(80, 200, 200, 0.1)" }}
                  >
                    {showInfoBox ? "Hide info" : "More info"}
                  </Button>
                </Flex>

                {/* Info box about probability and confidence */}
                <Collapse in={showInfoBox} animateOpacity>
                  <Box mb={4} p={3} bg="rgba(0,0,0,0.2)" borderRadius="md" borderLeft="3px solid" borderColor="blue.400">
                    <Text fontSize="sm" color="gray.300">
                      <strong>Probability:</strong> The likelihood that a customer will choose this product as a substitute when the original is unavailable.
                    </Text>
                    <Text fontSize="sm" color="gray.300" mt={1}>
                      <strong>Confidence:</strong> How similar this product is to the original in terms of characteristics and purchase patterns.
                    </Text>
                  </Box>
                </Collapse>

                {displayedSubs
                  .sort((a, b) => prediction.confidences[b] - prediction.confidences[a])
                  .map((sub, idx) => (
                    <MotionBox
                      key={sub}
                      p={2}
                      mb={2}
                      bg="gray.700"
                      rounded="md"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      _hover={{ bg: "gray.600", borderColor: "whiteAlpha.300" }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Flex justify="space-between" align="flex-start">
                        <Text fontWeight="bold" display="flex" alignItems="center">
                          <Badge
                            colorScheme="blue"
                            borderRadius="full"
                            mr={2}
                            fontSize="xs"
                          >
                            {idx + 1}
                          </Badge>
                          {prediction.product_details?.[sub]?.Articol || "Product"}
                          <Badge ml={2} colorScheme="gray" fontSize="xs">
                            ID: {sub}
                          </Badge>
                        </Text>
                      </Flex>

                      {/* Probability row cu bara de progres verde pe roșu */}
                      <HStack mt={2} spacing={2} align="center">
                        <Text fontSize="sm" fontWeight="500" color="gray.300" width="80px">Probability:</Text>
                        <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="md">
                          {prediction.probabilities[sub]?.toFixed(2)}%
                        </Badge>

                        {/* track + fill */}
                        <Box w="100%" h="8px" bg="red.600" opacity={0.25} rounded="full" overflow="hidden">
                          <Box
                            h="full"
                            bg="green.400"
                            w={`${prediction.probabilities[sub]}%`}
                            transition="width .4s"
                          />
                        </Box>
                      </HStack>

                      {/* Confidence row - FĂRĂ bară de progres */}
                      <HStack mt={2} spacing={2} align="center">
                        <Text fontSize="sm" fontWeight="500" color="gray.300" width="80px">Confidence:</Text>
                        <Badge colorScheme="purple" px={2} py={0.5} borderRadius="md">
                          {prediction.confidences[sub]?.toFixed(2)}%
                        </Badge>
                      </HStack>
                    </MotionBox>
                  ))}

                {/* Grafic și legendă */}
                <Flex mt={4} bg="whiteAlpha.100" p={3} rounded="md" direction={{ base: "column", md: "row" }} align="center">
                  <Box flex="1">
                    <Heading size="sm" mb={2} color="blue.300" display="flex" alignItems="center">
                      <FiBarChart2 style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Performance Analysis
                    </Heading>
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        {/* Axele */}
                        <XAxis dataKey="name" stroke="#fff" />
                        <YAxis stroke="#fff" />

                        {/* Tooltip cu formatter pentru 2 zecimale */}
                        <RechartsTooltip
                          formatter={customTooltipFormatter}
                          contentStyle={tooltipStyle}
                        />

                        {/* Bara violet – confidence */}
                        <Bar
                          name="Confidence"
                          dataKey="confidence"
                          fill="#9f7aea"
                          barSize={40}
                          radius={[4, 4, 0, 0]}
                        />

                        {/* Linie – probability */}
                        <Line
                          name="Probability"
                          dataKey="probability"
                          type="monotone"
                          stroke="#4fd1c5"
                          strokeWidth={3}
                          dot={{ r: 4, stroke: "#4fd1c5", fill: "#25141a" }}
                        />

                        {/* Custom tooltip */}
                        <RechartsTooltip content={<CustomTooltip />} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Legendă explicativă */}
                  <Flex
                    direction="column"
                    ml={{ base: 0, md: 6 }}
                    mt={{ base: 4, md: 0 }}
                    minW="150px"
                    bg="whiteAlpha.100"
                    p={3}
                    borderRadius="md"
                  >
                    <Heading size="xs" mb={2} color="gray.100">Legend</Heading>

                    <Flex align="center" mb={2}>
                      <Box w="12px" h="12px" bg="#4fd1c5" borderRadius="sm" mr={2}></Box>
                      <Text fontSize="sm" color="gray.300">Line - Probability</Text>
                    </Flex>

                    <Flex align="center">
                      <Box w="12px" h="12px" bg="#9f7aea" borderRadius="sm" mr={2}></Box>
                      <Text fontSize="sm" color="gray.300">Bar - Confidence</Text>
                    </Flex>

                    <Text fontSize="xs" color="gray.400" mt={2}>
                      <FiInfo style={{ display: 'inline', marginRight: '4px' }} />
                      Values shown as percentages
                    </Text>
                  </Flex>
                </Flex>

                {/* Toggle show/hide link */}
                {hiddenSubs.length > 0 && (
                  <Flex
                    mt={2}
                    align="center"
                    justify="flex-end"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      color="cyan.300"
                      leftIcon={showSubsAll ? <FiEyeOff style={{ strokeWidth: 2.5 }} /> : <FiEye style={{ strokeWidth: 2.5 }} />}
                      onClick={() => setShowSubsAll((prev) => !prev)}
                    >
                      {showSubsAll
                        ? "Hide extras"
                        : `Show all (${prediction.substitutes.length})`}
                    </Button>
                  </Flex>
                )}
              </MotionBox>
            </ScaleFade>
          </GridItem>

          {/* Right column: predict card */}
          <GridItem colSpan={{ base: 12, lg: 4 }}>
            <Flex direction="column" gap={3}>
              {/* card 1: predict */}
              <ScaleFade initialScale={0.95} in={true}>
                <MotionBox
                  bg="whiteAlpha.200"
                  p={4}
                  rounded="lg"
                  shadow="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  width="100%"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Heading size="sm" mb={3} color="teal.300" display="flex" alignItems="center">
                    <FiSearch style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Predict Other Substitutes
                  </Heading>
                  <VStack spacing={3}>
                    <Box position="relative" width="100%">
                      <InputGroup>
                        <InputLeftElement pointerEvents="none">
                          <FiSearch color="gray.300" />
                        </InputLeftElement>
                        <Input
                          placeholder="Search by product ID or name..."
                          value={searchQuery}
                          onChange={handleSearchChange}
                          bg="whiteAlpha.300"
                          border="none"
                          borderRadius="md"
                          ref={searchInputRef}
                          _focus={{
                            borderColor: "teal.300",
                            boxShadow: "0 0 0 1px teal.300"
                          }}
                        />
                        {isSearching && (
                          <InputRightElement>
                            <Spinner size="sm" color="teal.300" />
                          </InputRightElement>
                        )}
                      </InputGroup>

                      {/* Search Results Dropdown */}
                      {showDropdown && searchResults.length > 0 && (
                        <Box
                          position="absolute"
                          width="100%"
                          bg="gray.800"
                          maxH="200px"
                          overflowY="auto"
                          mt={1}
                          borderRadius="md"
                          boxShadow="lg"
                          zIndex={10}
                          borderWidth="1px"
                          borderColor="gray.700"
                          ref={dropdownRef}
                        >
                          <List spacing={0}>
                            {searchResults.map((product) => (
                              <ListItem
                                key={product.id}
                                py={2}
                                px={3}
                                _hover={{ bg: "gray.700" }}
                                cursor="pointer"
                                onClick={() => handleSelectProduct(product)}
                              >
                                <Text fontWeight="medium" fontSize="sm">{product.name}</Text>
                                <Text fontSize="xs" color="gray.400">ID: {product.id}</Text>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                    <Button
                      colorScheme="teal"
                      onClick={handlePredict}
                      isLoading={loading}
                      loadingText="Predicting"
                      leftIcon={<FiSearch style={{ strokeWidth: 2.5 }} />}
                      width="100%"
                      fontWeight="600"
                    >
                      Predict
                    </Button>
                  </VStack>
                </MotionBox>
              </ScaleFade>

              {/* card 2: stock adjustment */}
              <ScaleFade initialScale={0.95} in={true} delay={0.1}>
                <MotionBox
                  bg="whiteAlpha.200"
                  p={4}
                  rounded="lg"
                  shadow="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                  width="100%"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Heading size="sm" mb={2} color="teal.300" display="flex" alignItems="center">
                    <FiPackage style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Recommended Stock Adjustment
                  </Heading>

                  <Text fontSize="sm" color="gray.300" mb={2}>
                    Enter the usual order quantity for the missing product to calculate
                    recommended additional stock quantities.
                  </Text>

                  <VStack align="stretch" spacing={3}>
                    <Input
                      placeholder="Enter usual order quantity…"
                      value={baseQty}
                      onChange={(e) => setBaseQty(e.target.value)}
                      bg="whiteAlpha.300"
                      border="none"
                      borderRadius="md"
                      _focus={{
                        borderColor: "blue.300",
                        boxShadow: "0 0 0 1px blue.300"
                      }}
                    />
                    {adjError && (
                      <Text fontSize="sm" color="red.300">
                        {adjError}
                      </Text>
                    )}
                    <Button
                      colorScheme="blue"
                      onClick={calcAdjustments}
                      leftIcon={<FiTrendingUp style={{ strokeWidth: 2.5 }} />}
                      fontWeight="600"
                    >
                      Calculate
                    </Button>
                  </VStack>

                  {/* results card cu pie chart */}
                  {adjList && (
                    <Box
                      mt={3}
                      bg="whiteAlpha.100"
                      p={3}
                      rounded="lg"
                      borderWidth="1px"
                      borderColor="whiteAlpha.200"
                      height="336px"
                      overflowY="auto"
                      css={{
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: 'rgba(0,0,0,0.1)',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: 'rgba(0,150,150,0.5)',
                          borderRadius: '10px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          background: 'rgba(0,150,150,0.7)',
                        },
                      }}
                    >
                      <Heading size="sm" mb={2} color="green.300" display="flex" alignItems="center">
                        <FiPlusCircle style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Recommended Quantities
                      </Heading>

                      {/* Pie chart pentru distribuția cantităților */}
                      <Box
                        height="160px"
                        mb={2}
                        css={{
                          '& .recharts-wrapper': {
                            cursor: 'default !important'
                          },
                          '& .recharts-surface': {
                            cursor: 'default !important'
                          },
                          '& .recharts-sector': {
                            cursor: 'default !important',
                            pointerEvents: 'none'
                          }
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart
                            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                            style={{ userSelect: 'none', pointerEvents: 'none' }}
                          >
                            <Pie
                              data={prepareAdjPieData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={55}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              isAnimationActive={true}
                              startAngle={90}
                              endAngle={-270}
                              onClick={null}
                              onMouseDown={null}
                              onMouseMove={null}
                            >
                              {prepareAdjPieData().map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={pieColors[index % pieColors.length]}
                                  stroke="rgba(0,0,0,0.3)"
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={adjTooltipFormatter}
                              contentStyle={tooltipStyle}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>

                      <VStack align="stretch" spacing={1}>
                        {adjList.map((r, i) => (
                          <Flex key={r.id} justify="space-between" align="center" p={1} borderRadius="md" bg="whiteAlpha.100">
                            <Text fontSize="sm" display="flex" alignItems="center" maxW="70%">
                              <FiChevronRight style={{ marginRight: '4px', flexShrink: 0 }} />
                              <Text isTruncated={false} wordBreak="break-word">{r.name}</Text>
                            </Text>
                            <Badge colorScheme="green" p={1} flexShrink={0}>+{r.add} units</Badge>
                          </Flex>
                        ))}
                      </VStack>
                    </Box>
                  )}
                </MotionBox>
              </ScaleFade>
            </Flex>
          </GridItem>
        </Grid>
      ) : (
        /* Centered card when no prediction */
        <ScaleFade initialScale={0.9} in={true}>
          <Flex justify="center" align="flex-start">
            <MotionBox
              bg="whiteAlpha.200"
              p={6}
              rounded="lg"
              shadow="md"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              flex="1"
              maxW={{ base: "100%", md: "500px" }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Heading size="md" mb={4} color="teal.300" display="flex" alignItems="center">
                <FiSearch style={{ marginRight: '10px', strokeWidth: 2.5 }} /> Predict Substitutes
              </Heading>
              <VStack spacing={4}>
                <Box position="relative" width="100%">
                  <InputGroup size="lg">
                    <InputLeftElement pointerEvents="none">
                      <FiSearch color="gray.300" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search by product ID or name..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      bg="whiteAlpha.300"
                      border="none"
                      borderRadius="md"
                      ref={searchInputRef}
                      _focus={{
                        borderColor: "teal.300",
                        boxShadow: "0 0 0 1px teal.300"
                      }}
                    />
                    {isSearching && (
                      <InputRightElement>
                        <Spinner size="sm" color="teal.300" />
                      </InputRightElement>
                    )}
                  </InputGroup>

                  {/* Search Results Dropdown */}
                  {showDropdown && searchResults.length > 0 && (
                    <Box
                      position="absolute"
                      width="100%"
                      bg="gray.800"
                      maxH="250px"
                      overflowY="auto"
                      mt={1}
                      borderRadius="md"
                      boxShadow="lg"
                      zIndex={10}
                      borderWidth="1px"
                      borderColor="gray.700"
                      ref={dropdownRef}
                    >
                      <List spacing={0}>
                        {searchResults.map((product) => (
                          <ListItem
                            key={product.id}
                            py={2}
                            px={3}
                            _hover={{ bg: "gray.700" }}
                            cursor="pointer"
                            onClick={() => handleSelectProduct(product)}
                          >
                            <Text fontWeight="medium">{product.name}</Text>
                            <Text fontSize="sm" color="gray.400">ID: {product.id}</Text>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
                <Button
                  colorScheme="teal"
                  onClick={handlePredict}
                  isLoading={loading}
                  loadingText="Predicting..."
                  width="100%"
                  height="50px"
                  leftIcon={<FiSearch style={{ strokeWidth: 2.5 }} />}
                  fontWeight="600"
                >
                  {loading ? "Predicting..." : "Predict Substitutes"}
                </Button>
              </VStack>
            </MotionBox>
          </Flex>
          {loading && (
            <Flex justify="center" mt={8}>
              <Spinner size="xl" color="teal.300" thickness="4px" />
              <Text fontSize="xl" color="teal.300" ml={4}>
                Analyzing product data...
              </Text>
            </Flex>
          )}
        </ScaleFade>
      )}

      {prediction?.error && (
        <Flex
          color="red.400"
          mt={4}
          justify="center"
          align="center"
          bg="red.900"
          p={3}
          borderRadius="md"
          opacity={0.9}
        >
          <FiAlertTriangle style={{ marginRight: '8px', strokeWidth: 2.5 }} />
          <Text fontWeight="500">{prediction.error}</Text>
        </Flex>
      )}
    </Box>
  );
}
