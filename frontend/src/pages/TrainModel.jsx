import React, { useState } from "react";
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
} from "@chakra-ui/react";

/**
 * Pagina TrainModel are un design asemănător cu Dashboard/Nomenclature:
 * - Un Box general cu minH="100vh" și padding
 * - Un card (Box) cu background "whiteAlpha.200" și efect de hover
 */
export default function TrainModel() {
  const [loading, setLoading] = useState(false);

  // Exemplu de funcție de "Train"
  const handleTrain = async () => {
    setLoading(true);
    try {
      // Aici pui logica de train (apel la API, etc.)
      await new Promise((res) => setTimeout(res, 2000)); // simulare delay
      alert("Model trained successfully!");
    } catch (error) {
      alert("Training failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex="1" height="100%" p={10} overflowY="auto">
      {/* Card pentru Train Model */}
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
            ⚙️ Train Model
          </Heading>
          <Text mb={6}>
            This is where you can train your model. Click the button below to start the training process.
          </Text>

          <HStack spacing={4}>
            <Button colorScheme="teal" onClick={handleTrain}>
              {loading ? <Spinner size="sm" /> : "Train Model"}
            </Button>
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
}
