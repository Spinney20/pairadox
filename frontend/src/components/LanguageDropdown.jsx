
import React from 'react';
import { Select } from '@chakra-ui/react';

const LANG_MAP = {
  en: 'en',
  ro: 'ro',
  fr: 'fr'
};

const LanguageDropdown = () => {
  const handleChange = (e) => {
    const lang = LANG_MAP[e.target.value] || 'en';
    const domain = window.location.hostname;
    document.cookie = `googtrans=/en/${lang};domain=${domain};path=/`;
    window.location.reload();
  };

  return (
    <Select
      placeholder="Language"
      onChange={handleChange}
      width="auto"
      variant="outline"
      color="white"
      bg="gray.700"
      borderColor="teal.300"
    >
      <option value="en">English</option>
      <option value="ro">Română</option>
      <option value="fr">Français</option>
    </Select>
  );
};

export default LanguageDropdown;
