<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const date = new Date();
const jpyRate = ref(0.03); // Default, will be updated
const eurRate = ref(4.2);  // Default, will be updated
let finalPrice = ref(0);
let showResults = ref(false);
let isLoading = ref(true);
let ratesError = ref(false);

const setJPYRate = async () => {
  try {
    const jpyResponse = await fetch('https://api.nbp.pl/api/exchangerates/rates/A/JPY/?format=json');
    if (!jpyResponse.ok) {
      throw new Error(`HTTP error! status: ${jpyResponse.status}`);
    }
    const jpyData = await jpyResponse.json();
    if (jpyData.rates && jpyData.rates.length > 0) {
      jpyRate.value = jpyData.rates[0].mid;
    } else {
      throw new Error('JPY rate data not found.');
    }
  } catch (error) {
    console.error('Error fetching JPY rate:', error);
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

const JpyCost = ref({
  pricejpy: 0,
  auctionCommissionJPY: 0.04,
  fob: 65000 ,
  transportOption: 1, //1 - RORO, 2 - Container
  transportCost: 305000,
});

const EurCost = ref({
  // dutyRate: 0.1, // Duty rate is now calculated dynamically
  VAT: 0.19,
  dutyAgency: 450, // This is in EUR, will be converted to PLN in calculation
});

const Vehicle = ref({
  vehicleType: 1, // 1 for Car, 2 for Motorcycle
  engineType: 1,  // Corresponds to options in the select
  year: date.getFullYear(), // Default to current year, user can change
});

const calculationDetails = ref({
  cifJPY: 0,
  cifPLN: 0,
  cifEUR: 0,
  dutyRate: 0,
  dutyAmount: 0,
  vatAmount: 0,
  agencyFeePLN: 0, // Storing agency fee in PLN
  tariffRate: 0,
  tariffAmount: 0,
  serviceFee: 0,
  transportToPoland: 0
});

const calculateCIF = () => {
  let auctionCommissionJPY = JpyCost.value.pricejpy * JpyCost.value.auctionCommissionJPY;
  return JpyCost.value.pricejpy + auctionCommissionJPY + JpyCost.value.fob + JpyCost.value.transportCost;
}

const calculateDutyRate = () => {
  let vehicleAge = date.getFullYear() - Vehicle.value.year;
  if (vehicleAge >= 30) { // Changed from 20 to 30 for "historical" vehicle
    return 0; // Duty 0% for historical vehicles (>= 30 years old)
  }
  if (Vehicle.value.vehicleType == 1) { // Car
    return 0.1; // 10% duty
  } else if (Vehicle.value.vehicleType == 2) { // Motorcycle
    return 0.06; // 6% duty
  }
  return 0.1; // Default to car duty if something is wrong
}

const selectTariff = () => {
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

const calculateTransportCost = () => { // Renamed for clarity
  if (Number(JpyCost.value.transportOption) === 1) { // RORO
    JpyCost.value.transportCost =  305000; // JPY
  } else if (Number(JpyCost.value.transportOption) === 2) { // Container
    JpyCost.value.transportCost = 105000; // JPY (example, assuming this is less)
  }
}

const calculateServiceFee = (cifPLN: number) => { // Parameter changed to cifPLN for clarity
  let commissionPln = 0;
  const priceJPY = JpyCost.value.pricejpy;

  if (priceJPY < 1000000) { // < 1M JPY
    commissionPln = 3000; // PLN
  } else if (priceJPY < 2000000) { // 1M - 2M JPY
    commissionPln = cifPLN * 0.1; // 10% of CIF in PLN
  } else if (priceJPY < 4000000) { // 2M - 4M JPY
    commissionPln = cifPLN * 0.07; // 7% of CIF in PLN
  } else if (priceJPY < 6000000) { // 4M - 6M JPY
    commissionPln = cifPLN * 0.05; // 5% of CIF in PLN
  } else { // >= 6M JPY
    commissionPln = 10000; // PLN (capped or example, adjust as needed)
  }
  return commissionPln;
};

const formatCurrency = (value: number, currency = 'PLN') => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency }).format(value);
}

const handleForm = (e: Event) => {
  e.preventDefault();
  showResults.value = true;
  calculateTransportCost();
  let dutyRate = calculateDutyRate();
  let tariffRate = selectTariff();
  let cifJPY = calculateCIF();

  let cifPLN = cifJPY * jpyRate.value;
  let cifEUR = cifPLN / eurRate.value;

  let dutyAmountPLN = cifPLN * dutyRate; // Duty calculated on CIF in PLN
  let valueAfterDutyPLN = cifPLN + dutyAmountPLN;

  let vatAmountPLN = valueAfterDutyPLN * EurCost.value.VAT;
  let agencyFeePLN = EurCost.value.dutyAgency * eurRate.value; // Convert agency fee to PLN
  
  let valueForTariffPLN = valueAfterDutyPLN; // Akcyza calculated from (CIF_PLN + Cło_PLN)
  let tariffAmountPLN = valueForTariffPLN * tariffRate;
  
  let serviceFeePLN = calculateServiceFee(cifPLN);
  const transportToPolandPLN = 3500; // PLN

  finalPrice.value = Math.round((valueAfterDutyPLN + vatAmountPLN + agencyFeePLN + tariffAmountPLN + serviceFeePLN + transportToPolandPLN) * 100) / 100;
  
  calculationDetails.value = {
    cifJPY: cifJPY,
    cifPLN: cifPLN,
    cifEUR: cifEUR,
    dutyRate: dutyRate * 100,
    dutyAmount: dutyAmountPLN,
    vatAmount: vatAmountPLN,
    agencyFeePLN: agencyFeePLN,
    tariffRate: tariffRate * 100,
    tariffAmount: tariffAmountPLN,
    serviceFee: serviceFeePLN,
    transportToPoland: transportToPolandPLN
  };
}

const resetForm = () => {
  JpyCost.value.pricejpy = 0;
  JpyCost.value.transportOption = 1;
  Vehicle.value.vehicleType = 1;
  Vehicle.value.engineType = 1;
  Vehicle.value.year = date.getFullYear();
  showResults.value = false;
  finalPrice.value = 0; // Reset final price
}

onMounted(async () => {
  isLoading.value = true;
  ratesError.value = false;
  try {
    await Promise.all([
      setJPYRate(),
      setEURRate()
    ]);
  } catch (error) {
    console.error('Error loading exchange rates:', error);
    // ratesError is already set within individual fetch functions
  } finally {
    isLoading.value = false;
  }
});

const currentYear = computed(() => new Date().getFullYear());
const currencyRatesInfo = computed(() => `Aktualne kursy NBP: 1 JPY = ${jpyRate.value.toFixed(4)} PLN, 1 EUR = ${eurRate.value.toFixed(4)} PLN`);
</script>

<template>
  <div class="page-container">
    <router-link to="/" class="btn-back">
      &larr; Powrót na stronę główną
    </router-link>
    
    <header class="header">
      <h1>Kalkulator Importu z Japonii</h1>
      <p class="subtitle">Precyzyjnie oszacuj całkowity koszt importu pojazdu z Japonii do Polski.</p>
      
      <div v-if="isLoading" class="banner loading-banner">
        <div class="spinner"></div>
        <span>Pobieranie aktualnych kursów walut NBP...</span>
      </div>
      
      <div v-else-if="ratesError" class="banner error-banner">
        <span>⚠️ Błąd pobierania kursów walut. Użyte zostaną wartości domyślne (JPY: {{jpyRate.toFixed(4)}}, EUR: {{eurRate.toFixed(4)}}). Prosimy o ostrożność.</span>
      </div>
      
      <div v-else class="banner rates-banner">
        <span>{{ currencyRatesInfo }}</span>
      </div>
    </header>

    <main class="main-content">
      <section class="form-column">
        <div class="content-card">
          <h2 class="section-title">Dane Pojazdu i Koszty</h2>
          <div class="accent-line"></div>
          
          <form @submit="handleForm" v-if="!showResults">
            <div class="form-group">
              <label for="car-price-jpy">Cena pojazdu w Japonii (JPY)</label>
              <input 
                type="number" 
                name="car-price-jpy" 
                id="car-price-jpy"
                min="0" 
                step="1000"
                v-model.number="JpyCost.pricejpy"
                required
                placeholder="np. 1250000"
              />
            </div>
            
            <div class="form-group">
              <label for="production-year">Rok produkcji</label>
              <input 
                type="number" 
                name="production-year" 
                id="production-year"
                v-model.number="Vehicle.year" 
                min="1900" 
                :max="currentYear"
                required
                placeholder="np. 2005"
              />
              <p class="form-hint">Pojazdy 30-letnie i starsze mogą kwalifikować się jako historyczne (0% cła).</p>
            </div>
            
            <div class="form-group">
              <label>Rodzaj transportu morskiego</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" value="1" v-model.number="JpyCost.transportOption" name="transport-type"/>
                  <span>RoRo (Roll-on/Roll-off)</span>
                </label>
                <label class="radio-label">
                  <input type="radio" value="2" v-model.number="JpyCost.transportOption" name="transport-type"/>
                  <span>Kontener (dzielony)</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="vehicle-type">Typ pojazdu</label>
              <select name="vehicle-type" id="vehicle-type" v-model.number="Vehicle.vehicleType">
                <option value="1">Samochód osobowy</option>
                <option value="2">Motocykl</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="tariff">Typ silnika / Stawka akcyzy</label>
              <select name="tariff" id="tariff" v-model.number="Vehicle.engineType">
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
            <h3 class="cost-category-title">Koszty w Japonii (JPY)</h3>
            <div class="cost-item">
              <span>Cena pojazdu na aukcji:</span>
              <span class="cost-value">{{ formatCurrency(JpyCost.pricejpy, 'JPY') }}</span>
            </div>
            <div class="cost-item">
              <span>Prowizja domu aukcyjnego (ok. 4%):</span>
              <span class="cost-value">{{ formatCurrency(JpyCost.pricejpy * JpyCost.auctionCommissionJPY, 'JPY') }}</span>
            </div>
            <div class="cost-item">
              <span>Opłaty FOB (eksportowe, dowóz do portu):</span>
              <span class="cost-value">{{ formatCurrency(JpyCost.fob, 'JPY') }}</span>
            </div>
            <div class="cost-item">
              <span>Transport morski (Japonia -> Europa):</span>
              <span class="cost-value">{{ formatCurrency(JpyCost.transportCost, 'JPY') }}</span>
            </div>
            <div class="cost-item subtotal">
              <span>SUMA CIF (Koszt, Ubezpieczenie, Fracht):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.cifJPY, 'JPY') }}</span>
            </div>
             <div class="cost-item equivalent">
              <span>Równowartość CIF w PLN (kurs {{ jpyRate.toFixed(4) }}):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.cifPLN) }}</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3 class="cost-category-title">Opłaty Importowe (PLN)</h3>
            <div class="cost-item">
              <span>Cło ({{ calculationDetails.dutyRate.toFixed(1) }}% od CIF w PLN):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.dutyAmount) }}</span>
            </div>
            <div class="cost-item">
              <span>VAT (19% od [CIF w PLN + Cło]):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.vatAmount) }}</span>
            </div>
             <div class="cost-item">
              <span>Opłaty portowe i agencji celnej ({{EurCost.dutyAgency}} EUR):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.agencyFeePLN) }}</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3 class="cost-category-title">Koszty w Polsce (PLN)</h3>
            <div class="cost-item">
              <span>Akcyza ({{ calculationDetails.tariffRate.toFixed(2) }}% od [CIF w PLN + Cło]):</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.tariffAmount) }}</span>
            </div>
            <div class="cost-item">
              <span>Transport pojazdu na terenie Polski:</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.transportToPoland) }}</span>
            </div>
            <div class="cost-item">
              <span>Prowizja za obsługę importu:</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.serviceFee) }}</span>
            </div>
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

    <!-- Ad Placeholder - Kept commented out for consistency 
    <div class="ad-container" :class="{ 'slide-down': showResults }">
      <div class="ad-placeholder">
        <span>Miejsce na reklamę</span>
      </div>
    </div>
    -->
    
    <footer class="footer">
      <p>© {{ currentYear }} ImportMaster | Kursy walut pobierane z API NBP.</p>
      <p class="disclaimer">Prezentowane kalkulacje mają charakter wyłącznie szacunkowy i informacyjny. Rzeczywiste koszty importu mogą się różnić w zależności od wielu czynników, w tym zmian kursów walut, faktycznych kosztów transportu, opłat portowych oraz indywidualnych warunków transakcji. Zalecamy kontakt w celu uzyskania dokładnej wyceny.</p>
    </footer>
  </div>
</template>

<style scoped>
/* Global Resets & Base Styles */
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
  max-width: 1280px; /* Slightly wider max-width for calculator page */
  margin: 0 auto;
  padding: 1rem; /* Base padding */
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
  align-self: flex-start; /* Align to the left */
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
  font-size: 2.5rem; /* Consistent with HomeView */
  font-weight: 700;
  color: #343a40;
  margin-bottom: 0.6rem;
}

.subtitle {
  font-size: 1.1rem; /* Consistent */
  color: #495057;
  max-width: 750px;
  margin: 0 auto 1.25rem auto;
}

/* Banners (Loading, Error, Rates) */
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
  background-color: #e0f3ff; /* Lighter blue */
  color: #005f99; /* Darker blue text */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid currentColor; /* Use text color */
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background-color: #ffebee; /* Light pink/red */
  color: #c62828; /* Dark red */
}

.rates-banner {
  background-color: #e6ffed; /* Light green */
  color: #1e7e34; /* Dark green */
}

/* Main Content Layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr; /* Default to single column */
  gap: 2rem;
  width: 100%;
  flex-grow: 1;
}

@media (min-width: 992px) { /* Breakpoint for two columns */
  .main-content {
    grid-template-columns: minmax(400px, 1.2fr) 1fr; /* Adjust ratio as needed */
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
  padding: 2rem; /* Generous padding */
  width: 100%;
}

.section-title {
  font-size: 1.6rem; /* Slightly larger for calculator sections */
  font-weight: 600;
  color: #343a40;
  margin-bottom: 0.6rem;
  text-align: left;
}

.accent-line {
  width: 50px;
  height: 4px;
  background-color: #007bff; /* Primary accent color */
  margin-bottom: 1.75rem;
  border-radius: 2px;
  text-align: left;
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

.radio-group {
  display: flex;
  flex-direction: column; /* Stack radio buttons for clarity */
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95rem;
  color: #495057;
}

.radio-label input[type="radio"] {
  width: auto;
  margin: 0;
  accent-color: #007bff; /* Modern way to color radio button */
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
  width: 100%; /* Full width for form buttons */
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
  background-color: #6c757d; /* Gray for secondary actions like reset */
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
  color: #007bff; /* Prominent blue */
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
  border-bottom: 1px solid #f8f9fa; /* Very subtle separator */
}
.cost-item:last-child {
  border-bottom: none;
}

.cost-item span:first-child {
  flex-basis: 60%; /* Give more space to description */
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
  border-top: 2px solid #007bff; /* Prominent separator for total */
}
.total-section .accent-line { /* Hide accent line if used before total */
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
  color: #007bff; /* Match prominent blue */
}

/* Footer */
.footer {
  text-align: center;
  padding: 2.5rem 0 1.5rem 0;
  font-size: 0.85rem;
  color: #6c757d;
  margin-top: auto; /* Pushes footer to bottom in flex column */
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

/* Ad Placeholder - Minimal styling if uncommented */
/*
.ad-container {
  margin: 2rem auto;
  max-width: 728px; 
}
.ad-placeholder {
  background-color: #e9ecef;
  padding: 2rem;
  text-align: center;
  border-radius: 8px;
  font-size: 1rem;
  color: #adb5bd;
  min-height: 90px;
}
*/

/* Responsive Adjustments */
@media (max-width: 991px) { /* Stack columns, adjust header/titles */
  .main-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .results-column {
    margin-top: 0; /* Remove top margin when stacked */
  }
  .header h1 {
    font-size: 2.15rem;
  }
  .subtitle {
    font-size: 1.05rem;
  }
  .section-title {
    font-size: 1.4rem;
  }
  .content-card {
    padding: 1.5rem;
  }
}

@media (max-width: 767px) { /* Adjust padding, fonts for smaller tablets/large phones */
  .page-container {
    padding: 0.75rem;
  }
  .btn-back {
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }
  .header h1 {
    font-size: 1.85rem;
  }
  .subtitle {
    font-size: 0.95rem;
  }
  .banner {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
  .section-title {
    font-size: 1.3rem;
  }
  .content-card {
    padding: 1.25rem;
  }
  .btn {
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
  }
  .final-price-prominent {
    font-size: 2rem;
  }
  .total-label {
    font-size: 1.15rem;
  }
  .total-value-final {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) { /* Fine-tune for small mobile screens */
   .page-container {
    padding: 0.5rem;
  }
  .header {
    padding-bottom: 1rem;
    margin-bottom: 1.5rem;
  }
  .header h1 {
    font-size: 1.65rem;
  }
  .subtitle {
    font-size: 0.9rem;
  }
  .content-card {
    padding: 1rem;
  }
  .form-group label {
    font-size: 0.9rem;
  }
  input[type="number"], select, .btn {
    font-size: 0.9rem;
  }
  .radio-label {
    font-size: 0.9rem;
  }
  .final-price-prominent {
    font-size: 1.8rem;
  }
  .cost-category-title {
    font-size: 1.1rem;
  }
  .cost-item, .cost-item span:first-child {
    font-size: 0.9rem;
  }
  .cost-item.subtotal .cost-value {
    font-size: 1rem;
  }
  .total-label {
    font-size: 1.1rem;
  }
  .total-value-final {
    font-size: 1.35rem;
  }
  .footer {
    padding: 2rem 0 1rem 0;
  }
}
</style>