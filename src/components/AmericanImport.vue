<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const date = new Date();
const usdRate = ref(4);
const eurRate = ref(4.2);
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
  auctionCostUSD: 0.075,
  transportCostUSA: 1000,
  shippingCost: 1000,
});

const EurCost = ref({
  dutyRate: 0.1,
  VAT: 0.23,
  dutyAgency: 450,
});

const Vehicle = ref({
  vehicleType: 1,
  engineType: 1,
  year: date.getFullYear(),
});

const calculationDetails = ref({
  cifUSD: 0,
  cifPLN: 0,
  cifEUR: 0,
  dutyAmount: 0,
  vatAmount: 0,
  agencyFee: 0,
  tariffRate: 0,
  tariffAmount: 0
});

const calculateCIF = () => {
  return UsaCost.value.priceUSD + (UsaCost.value.priceUSD * UsaCost.value.auctionCostUSD) + UsaCost.value.transportCostUSA + UsaCost.value.shippingCost;
}

const calculateDutyRate = () => {
  let vehicleAge = date.getFullYear() - Vehicle.value.year;
  if (vehicleAge >= 20) {
    return 0;
  }
  if (Vehicle.value.vehicleType == 1) {
    return 0.1;
  } else if (Vehicle.value.vehicleType == 2) {
    return 0.06
  }
  return 0;
}

const selectTariff = () => {
  switch (parseInt(Vehicle.value.engineType)) {
    case 1:
      return 0.031;
    case 2:
    case 5:
    case 8:
      return 0.186;
    case 3:
      return 0.0155;
    case 4:
    case 7:
      return 0.093;
    case 6:
    case 9:
      return 0;
    default:
      return 0;
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
}

const handleForm = (e: Event) => {
  e.preventDefault();
  showResults.value = true;
  
  let cif = calculateCIF();
  let dutyRate = calculateDutyRate();
  let tariffRate = selectTariff();
  
  // CIF from USD to PLN
  let cifPLN = cif * usdRate.value;
  let cifEUR = cifPLN / eurRate.value;
  let vehicleValueEUR = cifEUR * (1 + dutyRate);
  let vehicleValueForTariff = vehicleValueEUR * eurRate.value;
  let dutyAmount = cifEUR * dutyRate * eurRate.value;
  let vatAmount = (vehicleValueEUR * EurCost.value.VAT)*eurRate.value;
  let agencyFee = EurCost.value.dutyAgency;
  let tariffAmount = vehicleValueForTariff * tariffRate;
  
  finalPrice.value = Math.round((vehicleValueForTariff + vatAmount + agencyFee + tariffAmount) * 100) / 100;
  
  // Store calculation details for display
  calculationDetails.value = {
    cifUSD: cif,
    cifPLN: cifPLN,
    cifEUR: cifEUR,
    dutyRate: dutyRate * 100,
    dutyAmount: dutyAmount,
    vatAmount: vatAmount,
    agencyFee: agencyFee,
    tariffRate: tariffRate * 100,
    tariffAmount: tariffAmount
  };
}

const resetForm = () => {
  UsaCost.value.priceUSD = 0;
  Vehicle.value.vehicleType = 1;
  Vehicle.value.engineType = 1;
  Vehicle.value.year = date.getFullYear();
  showResults.value = false;
}

onMounted(async () => {
  try {
    await Promise.all([
      setUSDRate(),
      setEURRate()
    ]);
  } catch (error) {
    console.error('Error loading exchange rates:', error);
    ratesError.value = true;
  } finally {
    isLoading.value = false;
  }
});

const currentYear = computed(() => new Date().getFullYear());
const currencyRatesInfo = computed(() => `USD: ${usdRate.value.toFixed(2)} PLN, EUR: ${eurRate.value.toFixed(2)} PLN`);
</script>

<template>
  <div class="calculator-container">
    <div class="header">
      <h1>Kalkulator importu pojazdu z USA</h1>
      <p class="subtitle">Oblicz koszt importu samochodu lub motocykla z USA do Polski</p>
      
      <div v-if="isLoading" class="loading-banner">
        <div class="spinner"></div>
        <span>Pobieranie aktualnych kursów walut...</span>
      </div>
      
      <div v-else-if="ratesError" class="error-banner">
        <span>⚠️ Błąd pobierania kursów walut. Używamy wartości domyślnych.</span>
      </div>
      
      <div v-else class="rates-banner">
        <span>Kursy walut: {{ currencyRatesInfo }}</span>
      </div>
    </div>

    <div class="content-container">
      <div class="calculator-form-container">
        <form @submit="handleForm" class="calculator-form" v-if="!showResults">
          <div class="form-group">
            <label for="car-price-usd">Cena pojazdu (USD)</label>
            <div class="input-with-symbol">
              <span class="currency-symbol">$</span>
              <input 
                type="number" 
                name="car-price-usd" 
                id="car-price-usd"
                min="0" 
                v-model="UsaCost.priceUSD"
                required
                placeholder="Podaj cenę w USD"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="vehicle-type">Typ pojazdu</label>
            <select name="vehicle-type" id="vehicle-type" v-model="Vehicle.vehicleType">
              <option value="1">Samochód</option>
              <option value="2">Motocykl</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="production-year">Rok produkcji</label>
            <input 
              type="number" 
              name="production-year" 
              id="production-year"
              v-model="Vehicle.year" 
              min="1900" 
              :max="currentYear"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="tariff">Typ silnika/akcyza</label>
            <select name="tariff" id="tariff" v-model="Vehicle.engineType">
              <optgroup label="Spalinowe">
                <option value="1">Pojemność silnika do 2000 cm³: 3,1%</option>
                <option value="2">Pojemność silnika powyżej 2000 cm³: 18,6%</option>
              </optgroup>
              <optgroup label="Hybrydowe">
                <option value="3">Pojemność silnika do 2000 cm³: 1,55%</option>
                <option value="4">Pojemność silnika powyżej 2000 cm³ (do 3500 cm³): 9,3%</option>
                <option value="5">Pojemność silnika powyżej 3500 cm³: 18.6%</option>
              </optgroup>
              <optgroup label="Hybrydy Plug-In">
                <option value="6">Pojemność silnika do 2000 cm³: 0%</option>
                <option value="7">Pojemność silnika powyżej 2000 cm³ (do 3500 cm³): 9,3%</option>
                <option value="8">Pojemność silnika powyżej 3500 cm³: 18.6%</option>
              </optgroup>
              <optgroup label="Elektryczne">
                <option value="9">Elektryczne: 0%</option>
              </optgroup>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-calculate">Oblicz koszt importu</button>
          </div>
        </form>
        
        <div class="results" v-else>
          <div class="result-header">
            <h2>Szacowany koszt importu:</h2>
            <div class="final-price">{{ formatCurrency(finalPrice) }}</div>
          </div>
          
          <div class="calculation-details">
            <h3>Szczegóły kalkulacji:</h3>
            <div class="detail-item">
              <span>Wartość pojazdu (USD):</span>
              <span>${{ UsaCost.priceUSD.toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span>Koszt CIF (USD):</span>
              <span>${{ calculationDetails.cifUSD.toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span>Koszt CIF (PLN):</span>
              <span>{{ formatCurrency(calculationDetails.cifPLN) }}</span>
            </div>
            <div class="detail-item">
              <span>Cło ({{ calculationDetails.dutyRate }}%):</span>
              <span>{{ formatCurrency(calculationDetails.dutyAmount) }}</span>
            </div>
            <div class="detail-item">
              <span>VAT (19%):</span>
              <span>{{ formatCurrency(calculationDetails.vatAmount) }}</span>
            </div>
            <div class="detail-item">
              <span>Opłata agencyjna:</span>
              <span>{{ calculationDetails.agencyFee }} EUR</span>
            </div>
            <div class="detail-item">
              <span>Akcyza ({{ calculationDetails.tariffRate }}%):</span>
              <span>{{ formatCurrency(calculationDetails.tariffAmount) }}</span>
            </div>
          </div>
          
          <div class="form-actions">
            <button @click="resetForm" class="btn-reset">Nowa kalkulacja</button>
          </div>
        </div>
      </div>
      
      <div class="ad-container">
        <div class="ad-placeholder">
          <span>Miejsce na reklamę</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>© {{ currentYear }} Import Calculator | Kursy walut pobierane z NBP API</p>
      <p class="disclaimer">Kalkulacja ma charakter szacunkowy. Faktyczne koszty mogą się różnić.</p>
    </div>
  </div>
</template>

<style scoped>
:root {
  --green-primary: #2e7d32;
  --green-light: #81c784;
  --green-lighter: #e8f5e9;
  --gray-light: #f5f5f5;
  --gray-medium: #ccc;
  --gray-dark: #444;
  --font-main: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.calculator-container {
  font-family: var(--font-main);
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--green-lighter);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: var(--green-primary);
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--gray-dark);
  font-size: 1rem;
}

.loading-banner,
.error-banner,
.rates-banner {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 500;
  text-align: center;
}

.loading-banner {
  background-color: var(--gray-light);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid var(--green-light);
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background-color: #ffebee;
  color: #c62828;
}

.rates-banner {
  background-color: #e0f2f1;
  color: var(--green-primary);
}

.content-container {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  flex-wrap: wrap;
}

.calculator-form-container {
  flex: 1;
  background-color: #ffffff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--green-primary);
}

input,
select {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid var(--gray-medium);
  border-radius: 8px;
  font-size: 1rem;
  background-color: #fefefe;
  transition: border-color 0.3s;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--green-light);
}

.input-with-symbol {
  display: flex;
  align-items: center;
}

.currency-symbol {
  padding: 0.6rem;
  background-color: var(--gray-light);
  border: 1px solid var(--gray-medium);
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-weight: 600;
}

.input-with-symbol input {
  border-left: none;
  border-radius: 0 8px 8px 0;
}

.form-actions {
  margin-top: 1.5rem;
  text-align: center;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-calculate {
  background-color: #1b5e20;
  color: white;
}

.btn-calculate:hover {
  background-color: #1b5e20;
}

.btn-reset {
  background-color: white;
  color: var(--green-primary);
  border: 2px solid var(--green-primary);
}

.btn-reset:hover {
  background-color: var(--green-lighter);
}

.results {
  padding-top: 1rem;
}

.result-header {
  text-align: center;
  margin-bottom: 1rem;
}

.final-price {
  font-size: 2rem;
  font-weight: bold;
  color: var(--green-primary);
}

.calculation-details {
  background-color: var(--gray-light);
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px dashed #bbb;
}

.ad-container {
  width: 250px;
  min-width: 200px;
  background-color: #f1f8e9;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  color: var(--green-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.footer {
  text-align: center;
  margin-top: 3rem;
  font-size: 0.875rem;
  color: var(--gray-dark);
}

.disclaimer {
  font-style: italic;
  margin-top: 0.5rem;
}

</style>