import { ANSWERS_PER_QUESTION } from "./config.js";

export async function loadCountries() {
  const countriesUrl = new URL("../countries.json", import.meta.url);
  const response = await fetch(countriesUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to load countries.json: ${response.status}`);
  }

  const countries = await response.json();

  if (!Array.isArray(countries) || countries.length < ANSWERS_PER_QUESTION) {
    throw new Error("countries.json must contain at least four countries.");
  }

  countries.forEach(validateCountry);

  return countries;
}

function validateCountry(country) {
  if (!country?.code || !country.country || !country.flag || !country.region) {
    throw new Error("Each country must include code, country, flag, and region.");
  }
}
