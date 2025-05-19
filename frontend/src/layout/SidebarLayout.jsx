import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Flex,
  Box,
  IconButton,
  Text,
  Button,
  VStack,
  useColorMode,
  Image,
  Avatar
} from "@chakra-ui/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SunIcon,
  MoonIcon
} from "@chakra-ui/icons";
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  FileBarChart
} from "lucide-react";

import logo from "../assets/LOGO_SMEKER.png";
import LanguageDropdown from "../components/LanguageDropdown";

export default function SidebarLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorMode, toggleColorMode } = useColorMode();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <Flex height="95vh">
      {/* Sidebar */}
      <Box
        as="nav"
        bg="rgba(255, 255, 255, 0.05)"
        backdropFilter="blur(10px)"
        borderRight="1px solid rgba(255, 255, 255, 0.1)"
        boxShadow="lg"
        w={isCollapsed ? "70px" : "200px"}
        transition="width 0.2s"
        p={3}
        display="flex"
        flexDirection="column"
        // IMPORTANT: împinge conținutul sus și jos
        justifyContent="space-between"
      >
        {/* Partea de sus din sidebar (logo MENU + butoane) */}
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            {!isCollapsed && (
              <Text fontSize="lg" fontWeight="bold" color="teal.200" ml={2}>
                MENU
              </Text>
            )}
            <IconButton
              icon={isCollapsed ? <ArrowRightIcon /> : <ArrowLeftIcon />}
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              colorScheme="teal"
              variant="outline"
              aria-label="Toggle sidebar"
            />
          </Flex>

          <VStack align={isCollapsed ? "center" : "stretch"} spacing={2}>
            <Button
              as={Link}
              to="/dashboard"
              variant="ghost"
              color="white"
              justifyContent={isCollapsed ? "center" : "flex-start"}
              leftIcon={<LayoutDashboard size={24} />}
              bg={isActive("/dashboard") ? "teal.500" : "transparent"}
              _hover={{
                transform: "translateX(6px)",
                transition: "transform 0.3s",
                bg: "teal.400"
              }}
            >
              {!isCollapsed && "Dashboard"}
            </Button>

            <Button
              as={Link}
              to="/nomenclature"
              variant="ghost"
              color="white"
              justifyContent={isCollapsed ? "center" : "flex-start"}
              leftIcon={<BookOpen size={24} />}
              bg={isActive("/nomenclature") ? "teal.500" : "transparent"}
              _hover={{
                transform: "translateX(6px)",
                transition: "transform 0.3s",
                bg: "teal.400"
              }}
            >
              {!isCollapsed && "Nomenclature"}
            </Button>

            <Button
              as={Link}
              to="/train-model"
              variant="ghost"
              color="white"
              justifyContent={isCollapsed ? "center" : "flex-start"}
              leftIcon={<BrainCircuit size={24} />}
              bg={isActive("/train-model") ? "teal.500" : "transparent"}
              _hover={{
                transform: "translateX(6px)",
                transition: "transform 0.3s",
                bg: "teal.400"
              }}
            >
              {!isCollapsed && "Train Model"}
            </Button>

            <Button
              as={Link}
              to="/reports"
              variant="ghost"
              color="white"
              justifyContent={isCollapsed ? "center" : "flex-start"}
              leftIcon={<FileBarChart size={24} />}
              bg={isActive("/reports") ? "teal.500" : "transparent"}
              _hover={{
                transform: "translateX(6px)",
                transition: "transform 0.3s",
                bg: "teal.400"
              }}
            >
              {!isCollapsed && "Reports"}
            </Button>
          </VStack>
        </Box>

        {/* Partea de jos din sidebar (Avatar/Username) */}
        <Box p={2}>
          <Button
            variant="ghost"
            color="white"
            justifyContent={isCollapsed ? "center" : "flex-start"}
            leftIcon={<Avatar size="sm" name="Username" />}
            w="100%"
            _hover={{
              transform: "translateX(6px)",
              transition: "transform 0.3s",
              bg: "teal.600"
            }}
          >
            {!isCollapsed && "Username"}
          </Button>
        </Box>
      </Box>

      {/* Main content */}
      <Flex direction="column" flex="1">
        {/* Top bar */}
        <Flex
          justify="space-between"
          align="center"
          p={4}
          bg="whiteAlpha.100"
          shadow="md"
        >
          {/* Logo + Title */}
          <Flex align="center" height="60px">
            <Image src={logo} alt="Logo" height="60px" objectFit="contain" />
            <Box ml={4} lineHeight="1.2">
              <Text fontSize="2xl" fontWeight="bold">
                PAIRADOX.AI
              </Text>
              <Text fontSize="sm" color="gray.300">
                for when something's missing
              </Text>
            </Box>
          </Flex>

          {/* Language + Dark mode */}
          <Flex align="center" gap={3}>
            <LanguageDropdown />
            <IconButton
              icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
              onClick={toggleColorMode}
              size="lg"
              colorScheme="teal"
              variant="outline"
              aria-label="Toggle Dark Mode"
            />
          </Flex>
        </Flex>

        {/* Content */}
        <Box flex="1">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
