<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const date = new Date();
const jpyRate = ref(0.03);
const eurRate = ref(4.2);
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
      throw new Error('jpy rate data not found.');
    }
  } catch (error) {
    console.error('Error fetching jpy rate:', error);
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
  dutyRate: 0.1,
  VAT: 0.19,
  dutyAgency: 450,
});

const Vehicle = ref({
  vehicleType: 1,
  engineType: 1,
  year: date.getFullYear(),
});

const calculationDetails = ref({
  cifjpy: 0,
  cifPLN: 0,
  cifEUR: 0,
  dutyAmount: 0,
  vatAmount: 0,
  agencyFee: 0,
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

const calcualteTransportCost = () => {
  if (JpyCost.value.transportOption == 1) {
    return 305000;
  }else if (JpyCost.value.transportOption == 2) {
    return 105000;
  }
}

const calculateServiceFee = (cif) => {
  let commissionPln = 0;
  if (JpyCost.value.pricejpy < 1000000) {
    commissionPln = 3000
  }else if (JpyCost.value.pricejpy < 2000000) {
    commissionPln = cif * 0.1
  }else if (JpyCost.value.pricejpy < 4000000) {
    commissionPln = cif * 0.07
  }else if (JpyCost.value.pricejpy < 6000000) {
    commissionPln = cif * 0.05
  }else {
    commissionPln = 10000
  } 
  return commissionPln;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
}

const handleForm = (e: Event) => {
  e.preventDefault();
  showResults.value = true;
  let transportCost = calcualteTransportCost();
  let dutyRate = calculateDutyRate();
  let tariffRate = selectTariff();
  let cif = calculateCIF();

  let cifPLN = cif * jpyRate.value;
  let cifEUR = cifPLN / eurRate.value;
  let vehicleValueEUR = cifEUR * (1 + dutyRate);
  let vehicleValueForTariff = vehicleValueEUR * eurRate.value;
  let dutyAmount = cifEUR * dutyRate * eurRate.value;
  let vatAmount = (vehicleValueEUR * EurCost.value.VAT)*eurRate.value;
  let agencyFee = EurCost.value.dutyAgency;
  let tariffAmount = vehicleValueForTariff * tariffRate;
  let serviceFee = calculateServiceFee(cifPLN); 
  const transportToPoland = 3500; //PLN
  
  finalPrice.value = Math.round((vehicleValueForTariff + vatAmount + agencyFee + tariffAmount+ serviceFee+ transportToPoland) * 100) / 100;
  
  calculationDetails.value = {
    cifJPY: cif,
    cifPLN: cifPLN,
    cifEUR: cifEUR,
    dutyRate: dutyRate * 100,
    dutyAmount: dutyAmount,
    vatAmount: vatAmount,
    agencyFee: agencyFee,
    tariffRate: tariffRate * 100,
    tariffAmount: tariffAmount,
    serviceFee: serviceFee,
    transportToPoland: transportToPoland
  };
}

const resetForm = () => {
  JpyCost.value.pricejpy = 0;
  Vehicle.value.vehicleType = 1;
  Vehicle.value.engineType = 1;
  Vehicle.value.year = date.getFullYear();
  showResults.value = false;
}

onMounted(async () => {
  try {
    await Promise.all([
      setJPYRate(),
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
const currencyRatesInfo = computed(() => `JPY: ${jpyRate.value.toFixed(3)} PLN, EUR: ${eurRate.value.toFixed(2)} PLN`);
</script>

<template>
  <router-link to="/">
    <button class="btn-calculate">Powrót na stronę główną</button>
  </router-link>
  <div class="calculator-container">
    <div class="header">
      <h1>Kalkulator importu pojazdu z Japonii</h1>
      <p class="subtitle">Oblicz koszt importu samochodu lub motocykla z Japonii do Polski</p>
      
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

    <div class="main-content">
      <div class="left-column">
        <div class="section">
          <h2 class="section-title">Oblicz cenę końcową oferty</h2>
          <div class="red-line"></div>
          
          <form @submit="handleForm" v-if="!showResults">
            <div class="form-group">
              <label for="car-price-jpy">Kwota aukcji</label>
              <p class="form-hint">(wpisz kwotę w walucie JPY)</p>
              <input 
                type="number" 
                name="car-price-jpy" 
                id="car-price-jpy"
                min="0" 
                v-model="JpyCost.pricejpy"
                required
                placeholder="0"
              />
            </div>
            
            <div class="form-group">
              <label>Rok produkcji</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" :value="1993" v-model="Vehicle.year" name="year"/>
                  <span>do 1993</span>
                </label>
                <label class="radio-label">
                  <input type="radio" :value="date.getFullYear()" v-model="Vehicle.year" name="year"/>
                  <span>od 1994</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>Rodzaj transportu</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" value="1" name="transport-type" v-model="JpyCost.transportOption"/>
                  <span>RoRo</span>
                </label>
                <label class="radio-label">
                  <input type="radio" value="2" name="transport-type" v-model="JpyCost.transportOption"/>
                  <span>Kontener</span>
                </label>
              </div>
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
              <label for="vehicle-type">Typ pojazdu</label>
              <select name="vehicle-type" id="vehicle-type" v-model="Vehicle.vehicleType">
                <option value="1">Samochód</option>
                <option value="2">Motocykl</option>
              </select>
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
          
          <div v-else class="results">
            <div class="result-header">
              <h3>Szacowany koszt importu:</h3>
              <div class="final-price">{{ formatCurrency(finalPrice) }}</div>
            </div>
            
            <div class="form-actions">
              <button @click="resetForm" class="btn-reset">Nowa kalkulacja</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="right-column" v-if="showResults">
        <div class="section">
          <h2 class="section-title">Podsumowanie kosztów</h2>
          <div class="red-line"></div>
          
          <div class="cost-section">
            <h3>Koszty w Japonii</h3>
            <div class="cost-item">
              <span>Prowizja domu aukcyjnego:</span>
              <span class="cost-value">{{ (JpyCost.pricejpy * JpyCost.auctionCommissionJPY).toFixed(0) }} JPY</span>
            </div>
            <div class="cost-item">
              <span>FOB - opłata administracyjna:</span>
              <span class="cost-value">{{ JpyCost.fob }} JPY</span>
            </div>
            <div class="cost-item">
              <span>Koszty transportu:</span>
              <span class="cost-value">{{ JpyCost.transportCost }} JPY</span>
            </div>
            <div class="cost-item">
              <span>CIF (koszt, ubezpieczenie, fracht):</span>
              <span class="cost-value"> {{ calculationDetails.cifJPY }} JPY</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3>Koszty w Europie</h3>
            <div class="cost-item">
              <span>Cło:</span>
              <span class="cost-value">{{ calculationDetails.dutyRate.toFixed(1) }}% ({{ formatCurrency(calculationDetails.dutyAmount) }})</span>
            </div>
            <div class="cost-item">
              <span>VAT:</span>
              <span class="cost-value">19% ({{ formatCurrency(calculationDetails.vatAmount) }})</span>
            </div>
            <div class="cost-item">
              <span>Koszty portowe:</span>
              <span class="cost-value">{{ calculationDetails.agencyFee }} EUR</span>
            </div>
          </div>
          
          <div class="cost-section">
            <h3>Koszty w Polsce</h3>
            <div class="cost-item">
              <span>Akcyza:</span>
              <span class="cost-value">{{ calculationDetails.tariffRate.toFixed(1) }}% ({{ formatCurrency(calculationDetails.tariffAmount) }})</span>
            </div>
            <div class="cost-item">
              <span>Koszt dostawy na terenie PL:</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.transportToPoland) }}</span>
            </div>
            <div class="cost-item">
              <span>Prowizja serwisu:</span>
              <span class="cost-value">{{ formatCurrency(calculationDetails.serviceFee) }}</span>
            </div>
          </div>
          
          <div class="total-section">
            <div class="red-line"></div>
            <div class="total-item">
              <span class="total-label">Razem:</span>
              <span class="total-value">{{ formatCurrency(finalPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="ad-container" :class="{ 'slide-down': showResults }">
      <div class="ad-placeholder">
        <span>Miejsce na reklamę</span>
      </div>
    </div>
    
    <div class="footer">
      <p>© {{ currentYear }} Import Calculator | Kursy walut pobierane z NBP API</p>
      <p class="disclaimer">Kalkulacja ma charakter szacunkowy. Faktyczne koszty mogą się różnić.</p>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

.calculator-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0 auto;
  padding: 2rem;
  background-color: #f5f5f5;
  min-height: 100vh;
  max-width: 1200px;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  color: #333;
  font-size: 2rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.subtitle {
  color: #666;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.loading-banner,
.error-banner,
.rates-banner {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-weight: 500;
  text-align: center;
  font-size: 0.9rem;
}

.loading-banner {
  background-color: #e3f2fd;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #1976d2;
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
  background-color: #e8f5e9;
  color: #2e7d32;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.left-column,
.right-column {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section {
  padding: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.red-line {
  width: 40px;
  height: 3px;
  background-color: #e53e3e;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.95rem;
}

.form-hint {
  font-size: 0.85rem;
  color: #666;
  margin: 0.25rem 0 0.5rem 0;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.radio-label input[type="radio"] {
  width: auto;
  margin: 0;
}

input[type="number"],
select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  transition: border-color 0.3s;
}

input[type="number"]:focus,
select:focus {
  outline: none;
  border-color: #3182ce;
}

input[type="number"] {
  text-align: left;
}

.form-actions {
  margin-top: 1.5rem;
}

.btn-calculate,
.btn-reset {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: 600;
}

.btn-calculate {
  background-color: #3182ce;
  color: white;
  width: 100%;
}

.btn-calculate:hover {
  background-color: #2c5282;
}

.btn-reset {
  background-color: #e53e3e;
  color: white;
  width: 100%;
}

.btn-reset:hover {
  background-color: #c53030;
}

.results {
  text-align: center;
}

.result-header h3 {
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 1rem;
}

.final-price {
  font-size: 1.5rem;
  font-weight: bold;
  color: #e53e3e;
  margin-bottom: 1.5rem;
}

.cost-section {
  margin-bottom: 1.5rem;
}

.cost-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.75rem;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.9rem;
  color: #555;
}

.cost-value {
  font-weight: 600;
  color: #333;
}

.total-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  font-size: 1.1rem;
}

.total-label {
  font-weight: 600;
  color: #333;
}

.total-value {
  font-weight: bold;
  font-size: 1.2rem;
  color: #e53e3e;
}

.ad-container {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s ease-in-out;
  margin-bottom: 2rem;
}

.ad-container.slide-down {
  max-height: 100px; /* Adjust based on ad placeholder height */
}

.ad-placeholder {
  background-color: #f0f0f0;
  padding: 1rem;
  text-align: center;
  border-radius: 8px;
  font-size: 1rem;
  color: #666;
}

.footer {
  text-align: center;
  font-size: 0.875rem;
  color: #666;
  margin-top: 2rem;
}

.disclaimer {
  font-style: italic;
  margin-top: 0.5rem;
  color: #888;
}
</style>