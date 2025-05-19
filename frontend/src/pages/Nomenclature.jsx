import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  HStack,
  VStack,
  Flex,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  SlideFade,
  Fade,
  ScaleFade,
  useToast,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  Divider,
  IconButton,
  Tooltip
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { uploadNomenclature } from "../api/fastapi";
import axios from "axios";
import {
  FiUpload,
  FiEye,
  FiEyeOff,
  FiTrash2,
  FiFile,
  FiDatabase,
  FiCheck,
  FiAlertTriangle,
  FiInfo,
  FiCalendar,
  FiBarChart2
} from "react-icons/fi";

const BASE_URL = "http://127.0.0.1:8000";

// Custom motion components
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export default function Nomenclature() {
  const [nomFile,   setNomFile]   = useState(null);
  const [salesFile, setSalesFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nomenclatureInfo, setNomenclatureInfo] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [showNomenclator, setShowNomenclator] = useState(false);
  const toast = useToast();

  // La montare, verificăm dacă nomenclatorul este încărcat
  useEffect(() => {
    checkNomenclature();
  }, []);

  const checkNomenclature = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/nomenclature-info`);
      setNomenclatureInfo(res.data);
    } catch (err) {
      console.error(err);
      setNomenclatureInfo({ exists: false });
    }
  };

  // Upload fișier
  const handleUpload = async () => {
    if (!nomFile || !salesFile) {
        toast({
          title: "Missing files",
          description: "Please select both nomenclature and sales files",
          status: "warning",
          duration: 3000,
          isClosable: true,
          position: "top"
        });
        return;
      }
    try {
      setLoading(true);
      const res = await uploadNomenclature(nomFile, salesFile);
      setUploadResult(res.data.message);
      toast({
        title: "Success",
        description: "Files uploaded successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "top"
      });
      // Reîmprospătăm informațiile nomenclatorului după upload
      checkNomenclature();
    } catch (err) {
      setUploadResult("❌ Upload Failed");
      toast({
        title: "Error",
        description: "Upload failed. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funcție de toggle pentru vizualizare nomenclator
  const toggleView = async () => {
    if (!showNomenclator) {
      setViewLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/nomenclature-info`);
        setNomenclatureInfo(res.data);
        setShowNomenclator(true);
      } catch (err) {
        console.error(err);
        setNomenclatureInfo({ exists: false });
      } finally {
        setViewLoading(false);
      }
    } else {
      setShowNomenclator(false);
    }
  };

  const nomInputRef   = useRef(null);
  const salesInputRef = useRef(null);

  // Ștergere nomenclator (cu confirmare)
  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear the current nomenclature?")) {
      try {
        setClearLoading(true);
        await axios.delete(`${BASE_URL}/clear-nomenclature`);
        setNomenclatureInfo({ exists: false });
        setUploadResult("Nomenclator cleared.");
        setShowNomenclator(false);
        toast({
          title: "Nomenclature cleared",
          description: "The nomenclature has been successfully cleared",
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "top"
        });
      } catch (err) {
        console.error(err);
        setUploadResult("❌ Clear Failed");
        toast({
          title: "Error",
          description: "Failed to clear nomenclature",
          status: "error",
          duration: 3000,
          isClosable: true,
          position: "top"
        });
      } finally {
        setClearLoading(false);
      }
    }
  };

  const shortName = (file, fallback) =>
    file ? (file.name.length > 22 ? file.name.slice(0, 19) + "…" : file.name)
         : fallback;

  return (
    <Box flex="1" height="100%" p={6} overflowY="auto">
      <Grid templateColumns="repeat(12, 1fr)" gap={4}>
        {/* Upload Section - Horizontal Layout */}
        <GridItem colSpan={12}>
          <ScaleFade initialScale={0.9} in={true}>
            <MotionBox
              bg="whiteAlpha.200"
              p={4}
              rounded="lg"
              shadow="md"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              mb={4}
            >
              <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={4}>
                <Box>
                  <Heading size="sm" mb={2} color="teal.300" display="flex" alignItems="center">
                    <FiUpload style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Upload Nomenclature
                  </Heading>
                </Box>

                <Flex flex="1" direction="row" gap={3} align="center" wrap={{ base: "wrap", md: "nowrap" }}>
                  {/* Nomenclator */}
                  <input
                    ref={nomInputRef}
                    type="file"
                    accept=".xlsx"
                    style={{ display: "none" }}
                    onChange={(e) => setNomFile(e.target.files[0])}
                  />
                  <MotionBox whileTap={{ scale: 0.98 }} flex="1">
                    <Button
                      variant="outline"
                      w="100%"
                      onClick={() => nomInputRef.current.click()}
                      colorScheme="teal"
                      h="40px"
                      borderRadius="md"
                      leftIcon={<FiFile style={{ strokeWidth: 2.5 }} />}
                      _hover={{ bg: "whiteAlpha.200" }}
                      size="sm"
                      fontWeight="800"
                      borderWidth="3px"
                    >
                      {shortName(nomFile, "Choose Nomenclature")}
                    </Button>
                  </MotionBox>

                  {/* Sales */}
                  <input
                    ref={salesInputRef}
                    type="file"
                    accept=".xlsx"
                    style={{ display: "none" }}
                    onChange={(e) => setSalesFile(e.target.files[0])}
                  />
                  <MotionBox whileTap={{ scale: 0.98 }} flex="1">
                    <Button
                      variant="outline"
                      w="100%"
                      onClick={() => salesInputRef.current.click()}
                      colorScheme="blue"
                      h="40px"
                      borderRadius="md"
                      leftIcon={<FiDatabase style={{ strokeWidth: 2.5 }} />}
                      _hover={{ bg: "whiteAlpha.200" }}
                      size="sm"
                      fontWeight="800"
                      borderWidth="3px"
                    >
                      {shortName(salesFile, "Choose Sales")}
                    </Button>
                  </MotionBox>

                  {/* Upload */}
                  <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      colorScheme="teal"
                      onClick={handleUpload}
                      isLoading={loading}
                      loadingText="Uploading..."
                      h="40px"
                      borderRadius="md"
                      leftIcon={<FiUpload style={{ strokeWidth: 2.5 }} />}
                      boxShadow="0px 2px 4px rgba(0, 0, 0, 0.2)"
                      size="sm"
                      fontWeight="600"
                    >
                      Upload
                    </Button>
                  </MotionBox>
                </Flex>
              </Flex>

              <Fade in={uploadResult !== null}>
                <Text mt={2} color="green.300" fontWeight="medium" fontSize="sm">
                  {uploadResult}
                </Text>
              </Fade>
            </MotionBox>
          </ScaleFade>
        </GridItem>

        {/* Action Bar */}
        <GridItem colSpan={12}>
          {nomenclatureInfo && nomenclatureInfo.exists && (
            <SlideFade in={true} offsetY="10px">
              <MotionBox
                bg="whiteAlpha.200"
                p={4}
                rounded="lg"
                shadow="md"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                mb={4}
              >
                <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={4}>
                  {/* Nomenclature Loaded - similar cu cel de sus */}
                  <Box>
                    <Heading size="sm" mb={2} color="teal.300" display="flex" alignItems="center">
                      <FiCheck style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Nomenclature Loaded
                    </Heading>
                  </Box>

                  {/* Info - Revert to original */}
                  <Flex flex="1" direction="row" gap={8} align="center" wrap={{ base: "wrap", md: "nowrap" }}>
                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="gray.400">Last Upload</StatLabel>
                      <StatNumber fontSize="md" display="flex" alignItems="center">
                        <FiCalendar style={{ marginRight: '8px', strokeWidth: 2.5 }} />
                        {nomenclatureInfo.lastUpload?.split(' ')[0] || 'N/A'}
                      </StatNumber>
                    </Stat>

                    <Stat size="sm">
                      <StatLabel fontSize="xs" color="gray.400">Products</StatLabel>
                      <StatNumber fontSize="md" display="flex" alignItems="center">
                        <FiBarChart2 style={{ marginRight: '8px', strokeWidth: 2.5 }} />
                        {nomenclatureInfo.productCount || 0}
                      </StatNumber>
                    </Stat>

                    {/* Buttons */}
                    <HStack spacing={3} ml="auto">
                      <Tooltip label={showNomenclator ? "Hide nomenclature" : "View nomenclature"}>
                        <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            colorScheme="blue"
                            onClick={toggleView}
                            isLoading={viewLoading}
                            loadingText="Loading..."
                            size="sm"
                            leftIcon={showNomenclator ? <FiEyeOff style={{ strokeWidth: 2.5 }} /> : <FiEye style={{ strokeWidth: 2.5 }} />}
                            variant={showNomenclator ? "solid" : "outline"}
                            fontWeight="600"
                            borderWidth={showNomenclator ? "1px" : "2px"}
                          >
                            {showNomenclator ? "Hide" : "View"}
                          </Button>
                        </MotionBox>
                      </Tooltip>

                      <Tooltip label="Clear nomenclature data">
                        <MotionBox whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            colorScheme="red"
                            onClick={handleClear}
                            isLoading={clearLoading}
                            loadingText="Clearing..."
                            size="sm"
                            leftIcon={<FiTrash2 style={{ strokeWidth: 2.5 }} />}
                            variant="outline"
                            fontWeight="600"
                            borderWidth="2px"
                          >
                            Clear
                          </Button>
                        </MotionBox>
                      </Tooltip>
                    </HStack>
                  </Flex>
                </Flex>
              </MotionBox>
            </SlideFade>
          )}
        </GridItem>

        {/* Nomenclature Viewer */}
        <GridItem colSpan={12}>
          {nomenclatureInfo && !nomenclatureInfo.exists ? (
            <SlideFade in={true} offsetY="10px">
              <Box
                bg="whiteAlpha.100"
                p={4}
                rounded="md"
                textAlign="center"
              >
                <Flex align="center" justify="center" gap={2} color="orange.300" fontSize="md">
                  <FiAlertTriangle style={{ strokeWidth: 2.5 }} />
                  <Text fontWeight="medium">No nomenclator found. Please upload files.</Text>
                </Flex>
              </Box>
            </SlideFade>
          ) : (
            <ScaleFade in={showNomenclator}>
              {showNomenclator && nomenclatureInfo.lastUpload && (
                <MotionBox
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  bg="whiteAlpha.200"
                  p={4}
                  rounded="lg"
                  shadow="md"
                  w="100%"
                  h="472px"
                  minH="200px"
                  overflowY="auto"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
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
                  <Box mb={2}>
                    <Heading size="sm" color="teal.300" display="flex" alignItems="center" mb={3}>
                      <FiDatabase style={{ marginRight: '8px', strokeWidth: 2.5 }} /> Nomenclature Data
                    </Heading>

                    {nomenclatureInfo.products && nomenclatureInfo.products.length > 0 ? (
                      <Box overflowX="auto">
                        <Table variant="simple" size="sm" colorScheme="teal">
                          <Thead position="sticky" top={0} bg="gray.800" zIndex={1} boxShadow="0 1px 2px rgba(0,0,0,0.2)">
                            <Tr>
                              <Th color="gray.300">ID</Th>
                              <Th color="gray.300">ARTICOL</Th>
                              <Th color="gray.300">PIATA</Th>
                              <Th color="gray.300">SEGMENT</Th>
                              <Th color="gray.300">CATEGORIE</Th>
                              <Th color="gray.300">FAMILIE</Th>
                              <Th isNumeric color="gray.300">PRET MEDIU</Th>
                              <Th color="gray.300">PROVENIENTA</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {nomenclatureInfo.products.map((row, idx) => (
                              <Tr
                                key={idx}
                                _hover={{ bg: "whiteAlpha.100" }}
                                transition="background 0.2s"
                              >
                                <Td>{row.ID}</Td>
                                <Td>
                                  <Badge
                                    bg="rgba(90,110,170,0.3)"
                                    color="white"
                                    p={1.5}
                                    borderRadius="md"
                                    fontWeight="500"
                                  >
                                    {row.Articol}
                                  </Badge>
                                </Td>
                                <Td>{row.Piata}</Td>
                                <Td>{row.Segment}</Td>
                                <Td>{row.Categorie}</Td>
                                <Td>{row.Familie}</Td>
                                <Td isNumeric fontWeight="semibold">{Number(row.Pret).toFixed(2)}</Td>
                                <Td fontWeight="500">{row.Provenienta}</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    ) : (
                      <Text>No products found.</Text>
                    )}
                  </Box>
                </MotionBox>
              )}
            </ScaleFade>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
