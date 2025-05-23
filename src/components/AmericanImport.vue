<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const date = new Date();
const usdRate = ref(4.00); // Default, will be updated
const eurRate = ref(4.20);  // Default, will be updated
let finalPrice = ref(0);
let showResults = ref(false);
let isLoading = ref(true);
let ratesError = ref(false);

const setUSDRate = async () => {
  try {
    const usdResponse = await fetch('https://api.nbp.pl/api/exchangerates/rates/A/USD/?format=json');
    if (!usdResponse.ok) {
      throw new Error(`HTTP error! status: ${usdResponse.status}`);
    }
    const usdData = await usdResponse.json();
    if (usdData.rates && usdData.rates.length > 0) {
      usdRate.value = usdData.rates[0].mid;
    } else {
      throw new Error('USD rate data not found.');
    }
  } catch (error) {
    console.error('Error fetching USD rate:', error);
    ratesError.value = true;
  }
}

const setEURRate = async () => {
  try {
    const eurResponse = await fetch('https://api.nbp.pl/api/exchangerates/rates/A/EUR/?format=json');
    if (!eurResponse.ok) {
      throw new Error(`HTTP error! status: ${eurResponse.status}`);
    }
    const eurData = await eurResponse.json();
    if (eurData.rates && eurData.rates.length > 0) {
      eurRate.value = eurData.rates[0].mid;
    } else {
      throw new Error('EUR rate data not found.');
    }
  } catch (error) {
    console.error('Error fetching EUR rate:', error);
    ratesError.value = true;
  }
}

const UsaCost = ref({
  priceUSD: 0,
  auctionFeeUSD: 0, // Example: 300 USD fixed, or calculated if percentage
  transportToPortUSA: 700, // Example: Inland transport in USA
  oceanFreightUSD: 1200, // Example: Shipping from US port to European port
  // auctionCostUSD: 0.075, // This seems to be a percentage, let's clarify if it's fixed or %
                           // Assuming a fixed auction fee for now, or it can be calculated based on priceUSD
});

const EurCost = ref({
  // dutyRate is calculated based on vehicle type
  VAT: 0.19, // Standard VAT rate in Poland
  dutyAgencyEUR: 450, // Agency fee in EUR
});

const Vehicle = ref({
  vehicleType: 1, // 1 for Car, 2 for Motorcycle, 3 for Other (e.g. Quad, Scooter)
  engineType: 1,  // Corresponds to options in the select for excise tax
  year: date.getFullYear(),
});

const calculationDetails = ref({
  priceWithAuctionFeeUSD: 0,
  cifUSD: 0,
  cifPLN: 0,
  // cifEUR: 0, // Not strictly needed for final calculation if all done in PLN
  dutyRate: 0,
  dutyAmountPLN: 0,
  vatAmountPLN: 0,
  agencyFeePLN: 0,
  tariffRate: 0,
  tariffAmountPLN: 0,
  transportToPolandPLN: 0 // Transport from European port to client in Poland
});

// Helper to calculate auction fee if it's percentage based
// For now, assuming UsaCost.auctionFeeUSD is a fixed value input by user or preset
// If it were, e.g., 7.5% of priceUSD:
// const getAuctionFee = () => UsaCost.value.priceUSD * 0.075;


const calculateCIF = () => {
  // const auctionFee = getAuctionFee(); // Use this if auction fee is percentage
  const auctionFee = UsaCost.value.auctionFeeUSD; // Using the fixed value for now
  const totalCostsInUSA = UsaCost.value.priceUSD + auctionFee + UsaCost.value.transportToPortUSA;
  return totalCostsInUSA + UsaCost.value.oceanFreightUSD;
}

const calculateDutyRate = () => {
  // For US imports, duty is typically applied regardless of age unless specific exemptions exist.
  // The 20/30 year rule for "classic" cars giving 0% duty is more of an EU specific agreement often applied to EU-origin or specific imports.
  // Standard US vehicle import duty rates to Poland:
  // Cars: 10%
  // Motorcycles: 6% (or 8% depending on engine size, but 6% is common for >800cc)
  // Trucks: 10% or 22%
  // For simplicity, we'll stick to car/motorcycle.
  const type = Number(Vehicle.value.vehicleType);
  if (type === 1) { // Car
    return 0.10;
  } else if (type === 2) { // Motorcycle
    return 0.06;
  } else if (type === 3) { // "Other" like Quads etc. - often 10% or specific codes
    return 0.10; // Defaulting to 10% for "Other" for now
  }
  return 0.10; // Default if type is not set
}

const selectTariff = () => { // Excise tax rates
  const type = Number(Vehicle.value.engineType);
  switch (type) {
    case 1: return 0.031; // Petrol <= 2000cc
    case 2: return 0.186; // Petrol > 2000cc
    case 3: return 0.0155; // Hybrid <= 2000cc
    case 4: return 0.093; // Hybrid > 2000cc (up to 3500cc)
    case 5: return 0.186; // Hybrid > 3500cc
    case 6: return 0;     // PHEV <= 2000cc
    case 7: return 0.093; // PHEV > 2000cc (up to 3500cc)
    case 8: return 0.186; // PHEV > 3500cc
    case 9: return 0;     // Electric
    default: return 0;
  }
};

const formatCurrency = (value: number, currency = 'PLN') => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency }).format(value);
}

const handleForm = (e: Event) => {
  e.preventDefault();
  showResults.value = true;
  
  let cifUSD = calculateCIF();
  let dutyRate = calculateDutyRate();
  let tariffRate = selectTariff();
  
  let cifPLN = cifUSD * usdRate.value;
  
  let dutyAmountPLN = cifPLN * dutyRate;
  let valueAfterDutyPLN = cifPLN + dutyAmountPLN;
  
  let vatAmountPLN = valueAfterDutyPLN * EurCost.value.VAT;
  let agencyFeePLN = EurCost.value.dutyAgencyEUR * eurRate.value; // Convert agency fee from EUR to PLN
  
  let valueForTariffPLN = valueAfterDutyPLN; // Excise tax base
  let tariffAmountPLN = valueForTariffPLN * tariffRate;
  
  const transportToPolandPLN = 3000; // Example: Transport from Bremerhaven to client in PL
  
  finalPrice.value = Math.round((valueAfterDutyPLN + vatAmountPLN + agencyFeePLN + tariffAmountPLN + transportToPolandPLN) * 100) / 100;
  
  calculationDetails.value = {
    priceWithAuctionFeeUSD: UsaCost.value.priceUSD + UsaCost.value.auctionFeeUSD,
    cifUSD: cifUSD,
    cifPLN: cifPLN,
    dutyRate: dutyRate * 100,
    dutyAmountPLN: dutyAmountPLN,
    vatAmountPLN: vatAmountPLN,
    agencyFeePLN: agencyFeePLN,
    tariffRate: tariffRate * 100,
    tariffAmountPLN: tariffAmountPLN,
    transportToPolandPLN: transportToPolandPLN
  };
}

const resetForm = () => {
  UsaCost.value.priceUSD = 0;
  UsaCost.value.auctionFeeUSD = 0;
  // Reset other UsaCost values if they are inputs, e.g., UsaCost.value.transportToPortUSA = 700;
  Vehicle.value.vehicleType = 1;
  Vehicle.value.engineType = 1;
  Vehicle.value.year = date.getFullYear();
  showResults.value = false;
  finalPrice.value = 0;
}

onMounted(async () => {
  isLoading.value = true;
  ratesError.value = false;
  try {
    await Promise.all([
      setUSDRate(),
      setEURRate()
    ]);
  } catch (error) {
    console.error('Error loading exchange rates:', error);
    // ratesError is set within individual fetch functions
  } finally {
    isLoading.value = false;
  }
});

const currentYear = computed(() => new Date().getFullYear());
const currencyRatesInfo = computed(() => `Aktualne kursy NBP: 1 USD = ${usdRate.value.toFixed(4)} PLN, 1 EUR = ${eurRate.value.toFixed(4)} PLN`);
</script>

<template>
  <div class="page-container">
    <router-link to="/" class="btn-back">
      &larr; Powrót na stronę główną
    </router-link>
    
    <header class="header">
      <h1>Kalkulator Importu z USA</h1>
      <p class="subtitle">Precyzyjnie oszacuj całkowity koszt importu pojazdu z USA do Polski.</p>
      
      <div v-if="isLoading" class="banner loading-banner">
        <div class="spinner"></div>
        <span>Pobieranie aktualnych kursów walut NBP...</span>
      </div>
      
      <div v-else-if="ratesError" class="banner error-banner">
        <span>⚠️ Błąd pobierania kursów walut. Użyte zostaną wartości domyślne (USD: {{usdRate.toFixed(4)}}, EUR: {{eurRate.toFixed(4)}}). Prosimy o ostrożność.</span>
      </div>
      
      <div v-else class="banner rates-banner">
        <span>{{ currencyRatesInfo }}</span>
      </div>
    </header>

    <main class="main-content">
      <section class="form-column">
        <div class="content-card">
          <h2 class="section-title">Dane Pojazdu i Koszty w USA</h2>
          <div class="accent-line"></div>
          
          <form @submit="handleForm" v-if="!showResults">
            <div class="form-group">
              <label for="car-price-usd">Cena zakupu pojazdu (USD)</label>
              <div class="input-with-symbol">
                <span class="currency-symbol">$</span>
                <input 
                  type="number" 
                  name="car-price-usd" 
                  id="car-price-usd"
                  min="0" 
                  step="100"
                  v-model.number="UsaCost.priceUSD"
                  required
                  placeholder="np. 15000"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="auction-fee-usd">Opłata aukcyjna / Dealera (USD)</label>
              <div class="input-with-symbol">
                <span class="currency-symbol">$</span>
                <input 
                  type="number" 
                  name="auction-fee-usd" 
                  id="auction-fee-usd"
                  min="0" 
                  step="10"
                  v-model.number="UsaCost.auctionFeeUSD"
                  placeholder="np. 300"
                />
              </div>
              <p class="form-hint">Wpisz 0, jeśli zawarte w cenie pojazdu.</p>
            </div>

            <div class="form-group">
              <label for="transport-to-port-usd">Transport do portu w USA (USD)</label>
              <div class="input-with-symbol">
                <span class="currency-symbol">$</span>
                <input 
                  type="number" 
                  name="transport-to-port-usd" 
                  id="transport-to-port-usd"
                  min="0" 
                  step="50"
                  v-model.number="UsaCost.transportToPortUSA"
                  placeholder="np. 700"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="ocean-freight-usd">Fracht morski USA -> Europa (USD)</label>
              <div class="input-with-symbol">
                <span class="currency-symbol">$</span>
                <input 
                  type="number" 
                  name="ocean-freight-usd" 
                  id="ocean-freight-usd"
                  min="0" 
                  step="50"
                  v-model.number="UsaCost.oceanFreightUSD"
                  placeholder="np. 1200"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="production-year-us">Rok produkcji</label>
              <input 
                type="number" 
                name="production-year-us" 
                id="production-year-us"
                v-model.number="Vehicle.year" 
                min="1900" 
                :max="currentYear"
                required
                placeholder="np. 2018"
              />
               <p class="form-hint">Standardowe stawki cła dla importu z USA. Wiek pojazdu rzadko wpływa na cło z USA do UE tak jak w przypadku importu np. z Japonii.</p>
            </div>
            
            <div class="form-group">
              <label for="vehicle-type-us">Typ pojazdu</label>
              <select name="vehicle-type-us" id="vehicle-type-us" v-model.number="Vehicle.vehicleType">
                <option value="1">Samochód osobowy (Cło: 10%)</option>
                <option value="2">Motocykl (Cło: 6%)</option>
                <option value="3">Inny (np. Quad, ATV - Cło: zazwyczaj 10%)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="tariff-us">Typ silnika / Stawka akcyzy</label>
              <select name="tariff-us" id="tariff-us" v-model.number="Vehicle.engineType">
                <optgroup label="Silniki Benzynowe">
                  <option value="1">Poj. do 2000 cm³ (Akcyza: 3.1%)</option>
                  <option value="2">Poj. pow. 2000 cm³ (Akcyza: 18.6%)</option>
                </optgroup>
                <optgroup label="Samochody Hybrydowe (HEV/MHEV)">
                  <option value="3">Poj. do 2000 cm³ (Akcyza: 1.55%)</option>
                  <option value="4">Poj. 2001-3500 cm³ (Akcyza: 9.3%)</option>
                  <option value="5">Poj. pow. 3500 cm³ (Akcyza: 18.6%)</option>
                </optgroup>
                <optgroup label="Hybrydy Plug-In (PHEV)">
                  <option value="6">Poj. do 2000 cm³ (Akcyza: 0%)</option>
                  <option value="7">Poj. 2001-3500 cm³ (Akcyza: 9.3%)</option>
                  <option value="8">Poj. pow. 3500 cm³ (Akcyza: 18.6%)</option>
                </optgroup>
                <optgroup label="Samochody Elektryczne (BEV)">
                  <option value="9">Wszystkie (Akcyza: 0%)</option>
                </optgroup>
              </select>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Oblicz Pełne Koszty</button>
            </div>
          </form>
          
          <div v-else class="results-summary-card">
            <h3 class="summary-title">Szacowany Całkowity Koszt Importu:</h3>
            <div class="final-price-prominent">{{ formatCurrency(finalPrice) }}</div>
            <p class="final-price-hint">(zawiera wszystkie opłaty, podatki i prowizje)</p>
            
            <div class="form-actions">
              <button @click="resetForm" class="btn btn-secondary">Oblicz Ponownie</button>
            </div>
          </div>
        </div>
      </section>
      
      <section class="results-column" v-if="showResults">
        <div class="content-card">
          <h2 class="section-title">Szczegółowe Podsumowanie Kosztów</h2>
          <div class="accent-line"></div>
          
          <div class="cost-section">
            <h3 class="cost-category-title">Koszty w USA (USD)</h3>
            <div class="cost-item">
              <span>Cena pojazdu:</span>
              <span class="cost-value">{{ formatCurrency(UsaCost.priceUSD, 'USD') }}</span>
            </div>
            <div class="cost-item">
              <span>Opłata aukcyjna / Dealera:</span>
              <span class="cost-value">{{ formatCurrency(UsaCost.auctionFeeUSD, 'USD') }}</span>
            </div>
             <div class="cost-item">
              <span>SUMA (Pojazd + Opłata aukcyjna):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.priceWithAuctionFeeUSD, 'USD') }}</span>
            </div>
            <div class="cost-item">
              <span>Transport do portu w USA:</span>
              <span class="cost-value">{{ formatCurrency(UsaCost.transportToPortUSA, 'USD') }}</span>
            </div>
            <div class="cost-item">
              <span>Fracht morski (USA -> Europa):</span>
              <span class="cost-value">{{ formatCurrency(UsaCost.oceanFreightUSD, 'USD') }}</span>
            </div>
            <div class="cost-item subtotal">
              <span>SUMA CIF (Koszt, Ubezpieczenie, Fracht):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.cifUSD, 'USD') }}</span>
            </div>
            <div class="cost-item equivalent">
              <span>Równowartość CIF w PLN (kurs {{ usdRate.toFixed(4) }}):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.cifPLN) }}</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3 class="cost-category-title">Opłaty Importowe (PLN)</h3>
            <div class="cost-item">
              <span>Cło ({{ calculationDetails.dutyRate.toFixed(1) }}% od CIF w PLN):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.dutyAmountPLN) }}</span>
            </div>
            <div class="cost-item">
              <span>VAT (19% od [CIF w PLN + Cło]):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.vatAmountPLN) }}</span>
            </div>
             <div class="cost-item">
              <span>Opłaty portowe i agencji celnej ({{EurCost.dutyAgencyEUR}} EUR):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.agencyFeePLN) }}</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3 class="cost-category-title">Koszty w Polsce (PLN)</h3>
            <div class="cost-item">
              <span>Akcyza ({{ calculationDetails.tariffRate.toFixed(2) }}% od [CIF w PLN + Cło]):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.tariffAmountPLN) }}</span>
            </div>
            <div class="cost-item">
              <span>Transport pojazdu na terenie Polski:</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.transportToPolandPLN) }}</span>
            </div>
            <!-- Note: Service/commission fee not included in this version, add if needed -->
          </div>
          
          <div class="total-section">
            <div class="accent-line"></div>
            <div class="total-item">
              <span class="total-label">Całkowity Koszt Importu (PLN):</span>
              <span class="total-value-final">{{ formatCurrency(finalPrice) }}</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Ad Placeholder - Kept commented out -->
    <!--
    <div class="ad-container" :class="{ 'slide-down': showResults }">
      <div class="ad-placeholder">
        <span>Miejsce na reklamę</span>
      </div>
    </div>
    -->
    
    <footer class="footer">
      <p>© {{ currentYear }} ImportMaster | Kursy walut pobierane z API NBP.</p>
      <p class="disclaimer">Prezentowane kalkulacje mają charakter wyłącznie szacunkowy i informacyjny. Rzeczywiste koszty importu mogą się różnić. Zalecamy kontakt w celu uzyskania dokładnej wyceny.</p>
    </footer>
  </div>
</template>

<style scoped>
/* Global Resets & Base Styles (consistent with JapanImport.vue) */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f8f9fa;
  color: #212529;
  line-height: 1.6;
  font-size: 16px;
}

.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 1280px; 
  margin: 0 auto;
  padding: 1rem;
}

/* Back Button */
.btn-back {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: #007bff;
  background-color: transparent;
  border: 1px solid #007bff;
  border-radius: 6px;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
  align-self: flex-start;
}

.btn-back:hover {
  background-color: #007bff;
  color: #ffffff;
}

/* Header */
.header {
  text-align: center;
  padding: 1rem 0 1.5rem 0;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2.5rem; 
  font-weight: 700;
  color: #343a40;
  margin-bottom: 0.6rem;
}

.subtitle {
  font-size: 1.1rem; 
  color: #495057;
  max-width: 750px;
  margin: 0 auto 1.25rem auto;
}

/* Banners */
.banner {
  margin-top: 1.5rem;
  padding: 0.85rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  font-size: 0.95rem;
  line-height: 1.5;
}

.loading-banner {
  background-color: #e0f3ff; 
  color: #005f99; 
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid currentColor; 
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background-color: #ffebee; 
  color: #c62828; 
}

.rates-banner {
  background-color: #e6ffed; 
  color: #1e7e34; 
}

/* Main Content Layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr; 
  gap: 2rem;
  width: 100%;
  flex-grow: 1;
}

@media (min-width: 992px) { 
  .main-content {
    grid-template-columns: minmax(400px, 1.2fr) 1fr; 
  }
}

.form-column, .results-column {
  display: flex;
  flex-direction: column;
}

.content-card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  padding: 2rem; 
  width: 100%;
}

.section-title {
  font-size: 1.6rem; 
  font-weight: 600;
  color: #343a40;
  margin-bottom: 0.6rem;
  text-align: left;
}

.accent-line {
  width: 50px;
  height: 4px;
  background-color: #007bff; 
  margin-bottom: 1.75rem;
  border-radius: 2px;
  /* text-align: left; ALREADY A BLOCK ELEMENT */
}

/* Form Styling */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #343a40;
  font-size: 0.95rem;
}

.form-hint {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.25rem;
}

.input-with-symbol {
  display: flex;
  align-items: center;
  border: 1px solid #ced4da;
  border-radius: 6px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}
.input-with-symbol:focus-within {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.currency-symbol {
  padding: 0.75rem 1rem;
  background-color: #e9ecef; /* Lighter gray for symbol bg */
  border-right: 1px solid #ced4da;
  color: #495057;
  font-weight: 600;
  border-radius: 6px 0 0 6px; /* Match parent border-radius */
}

.input-with-symbol input[type="number"] {
  border: none; /* Remove individual border */
  border-radius: 0 6px 6px 0; /* Adjust to fit */
  padding-left: 0.75rem; /* Add some padding */
  box-shadow: none; /* Remove individual focus shadow */
}
.input-with-symbol input[type="number"]:focus {
  outline: none;
  box-shadow: none; /* Ensure no double shadow */
}


input[type="number"],
select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  background-color: #ffffff;
  color: #495057;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

input[type="number"]:focus,
select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

input::placeholder {
  color: #adb5bd;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.875rem 1.75rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  text-align: center;
  text-decoration: none;
  width: 100%; 
}

.btn-primary {
  background-color: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.btn-primary:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}
.btn-primary:active {
  background-color: #004085;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #6c757d; 
  color: white;
}
.btn-secondary:hover {
  background-color: #545b62;
  transform: translateY(-2px);
}
.btn-secondary:active {
  background-color: #42474c;
  transform: translateY(-1px);
}

.form-actions {
  margin-top: 2rem;
}

/* Results Summary Card (in form column after submission) */
.results-summary-card {
  text-align: center;
  padding: 1rem 0;
}
.summary-title {
  font-size: 1.15rem;
  color: #495057;
  margin-bottom: 0.75rem;
  font-weight: 600;
}
.final-price-prominent {
  font-size: 2.25rem;
  font-weight: 700;
  color: #007bff; 
  margin-bottom: 0.5rem;
}
.final-price-hint {
  font-size: 0.85rem;
  color: #6c757d;
  margin-bottom: 1.5rem;
}

/* Detailed Results Column Styling */
.results-column .section-title {
  margin-bottom: 0.6rem;
}
.results-column .accent-line {
  margin-bottom: 1.75rem;
}

.cost-section {
  margin-bottom: 2rem;
}
.cost-category-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #343a40;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}
.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  font-size: 0.95rem;
  color: #495057;
  border-bottom: 1px solid #f8f9fa; 
}
.cost-item:last-child {
  border-bottom: none;
}
.cost-item span:first-child {
  flex-basis: 65%; /* More space for description */
  padding-right: 0.5rem;
}
.cost-value {
  font-weight: 600;
  color: #212529;
  text-align: right;
}
.cost-item.subtotal {
  font-weight: bold;
  color: #343a40;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #dee2e6;
}
.cost-item.subtotal .cost-value {
  font-size: 1.05rem;
}
.cost-item.equivalent {
  font-size: 0.85rem;
  color: #6c757d;
}
.cost-item.equivalent .cost-value {
  font-weight: normal;
}

.total-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid #007bff; 
}
.total-section .accent-line { 
  display: none;
}
.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}
.total-label {
  font-size: 1.25rem;
  font-weight: 700;
  color: #343a40;
}
.total-value-final {
  font-size: 1.75rem;
  font-weight: bold;
  color: #007bff; 
}

/* Footer */
.footer {
  text-align: center;
  padding: 2.5rem 0 1.5rem 0;
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: auto; 
  border-top: 1px solid #dee2e6;
}
.disclaimer {
  font-size: 0.75rem;
  font-style: italic;
  margin-top: 0.75rem;
  color: #868e96;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

/* Responsive Adjustments */
@media (max-width: 991px) { 
  .main-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .results-column {
    margin-top: 0; 
  }
  .header h1 { font-size: 2.15rem; }
  .subtitle { font-size: 1.05rem; }
  .section-title { font-size: 1.4rem; }
  .content-card { padding: 1.5rem; }
}

@media (max-width: 767px) { 
  .page-container { padding: 0.75rem; }
  .btn-back { padding: 0.5rem 1rem; margin-bottom: 1rem; font-size: 0.85rem; }
  .header h1 { font-size: 1.85rem; }
  .subtitle { font-size: 0.95rem; }
  .banner { padding: 0.75rem 1rem; font-size: 0.9rem; }
  .section-title { font-size: 1.3rem; }
  .content-card { padding: 1.25rem; }
  .btn { padding: 0.75rem 1.5rem; font-size: 0.95rem; }
  .final-price-prominent { font-size: 2rem; }
  .total-label { font-size: 1.15rem; }
  .total-value-final { font-size: 1.5rem; }
}

@media (max-width: 480px) { 
   .page-container { padding: 0.5rem; }
  .header { padding-bottom: 1rem; margin-bottom: 1.5rem; }
  .header h1 { font-size: 1.65rem; }
  .subtitle { font-size: 0.9rem; }
  .content-card { padding: 1rem; }
  .form-group label { font-size: 0.9rem; }
  input[type="number"], select, .btn, .currency-symbol { font-size: 0.9rem; }
  .input-with-symbol input[type="number"] { padding-left: 0.5rem; }
  .currency-symbol { padding: 0.75rem 0.75rem; }
  .final-price-prominent { font-size: 1.8rem; }
  .cost-category-title { font-size: 1.1rem; }
  .cost-item, .cost-item span:first-child { font-size: 0.9rem; }
  .cost-item.subtotal .cost-value { font-size: 1rem; }
  .total-label { font-size: 1.1rem; }
  .total-value-final { font-size: 1.35rem; }
  .footer { padding: 2rem 0 1rem 0; }
}
</style>