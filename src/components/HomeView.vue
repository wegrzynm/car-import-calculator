<script setup lang="ts">
import { ref } from 'vue'

const showAd = ref(false);

const toggleAd = () => {
  showAd.value = true;
}
</script>

<template>
  <div class="landing-container">
    <div class="header">
      <h1>Kalkulator Importu Pojazdów</h1>
      <p class="subtitle">Oblicz koszty importu samochodów i motocykli z Japonii lub USA do Polski</p>
    </div>

    <div class="main-content">
      <div class="section">
        <h2 class="section-title">Witaj w naszym kalkulatorze importu!</h2>
        <div class="red-line"></div>
        <p class="intro-text">
          Planujesz import pojazdu z Japonii lub USA? Nasz kalkulator pomoże Ci oszacować pełne koszty, 
          w tym cło, VAT, akcyzę i inne opłaty. Korzystamy z aktualnych kursów walut z NBP, aby 
          zapewnić precyzyjne wyliczenia. Wybierz kraj pochodzenia pojazdu i zacznij już teraz!
        </p>
        <div class="calculator-links">
          <a href="/import-japonia" class="btn-calculate" @click="toggleAd">
            Kalkulator importu z Japonii
          </a>
          <a href="/import-usa" class="btn-calculate" @click="toggleAd">
            Kalkulator importu z USA
          </a>
        </div>
      </div>
    </div>

    <div class="ad-container" :class="{ 'slide-down': showAd }">
      <div class="ad-placeholder">
        <span>Miejsce na reklamę</span>
      </div>
    </div>

    <div class="footer">
      <p>© {{ new Date().getFullYear() }} Import Calculator | Kursy walut pobierane z NBP API</p>
      <p class="disclaimer">Kalkulacje mają charakter szacunkowy. Faktyczne koszty mogą się różnić.</p>
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

.landing-container {
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

.main-content {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  max-width: 600px;
  width: 100%;
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

.intro-text {
  font-size: 1rem;
  color: #555;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.calculator-links {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.btn-calculate {
  display: block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: 600;
  background-color: #3182ce;
  color: white;
  text-align: center;
  text-decoration: none;
}

.btn-calculate:hover {
  background-color: #2c5282;
}

.ad-container {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s ease-in-out;
  margin-bottom: 2rem;
}

.ad-container.slide-down {
  max-height: 100px;
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