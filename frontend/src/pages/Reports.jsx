import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  HStack,
  Flex,
  Spinner,
} from "@chakra-ui/react";

/**
 * Pagina Reports are un design asemănător cu Dashboard/Nomenclature:
 * - Un Box general cu minH="100vh" și padding
 * - Un card (Box) cu background "whiteAlpha.200" și efect de hover
 */
export default function Reports() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Exemplu de funcție de "Generate Reports"
  const handleGenerateReports = async () => {
    setLoading(true);
    try {
      // Aici pui logica de generare rapoarte (apel la API, etc.)
      await new Promise((res) => setTimeout(res, 2000)); // simulare delay
      // Rezultatele raportului (simulare)
      setReportData({
        summary: "Rezumat raport",
        details: "Detalii despre vânzări / substituții / etc.",
      });
    } catch (error) {
      alert("Report generation failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex="1" height="100%" p={10} overflowY="auto">
      {/* Card pentru Reports */}
      <Flex justify="center" align="flex-start">
        <Box
          bg="whiteAlpha.200"
          p={8}
          rounded="2xl"
          shadow="2xl"
          w={{ base: "100%", md: "60%" }}
          _hover={{ transform: "scale(1.02)", transition: "0.3s" }}
        >
          <Heading size="md" mb={4}>
            📊 Reports
          </Heading>
          <Text mb={6}>
            Generate custom reports based on your data. Click the button below to generate reports.
          </Text>

          <HStack spacing={4}>
            <Button colorScheme="blue" onClick={handleGenerateReports}>
              {loading ? <Spinner size="sm" /> : "Generate Reports"}
            </Button>
          </HStack>

          {/* Afișare rapoarte după generare */}
          {reportData && (
            <Box mt={8} bg="whiteAlpha.300" p={5} rounded="lg">
              <Heading size="sm" mb={2}>
                {reportData.summary}
              </Heading>
              <Text>{reportData.details}</Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
