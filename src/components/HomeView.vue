<script setup lang="ts">
// import { ref } from 'vue' // showAd related, commented out for now

// const showAd = ref(false); // Ad functionality commented out

// const toggleAd = () => { // Ad functionality commented out
//   showAd.value = true;
// }
</script>

<template>
  <div class="landing-container">
    <header class="header">
      <h1>Kalkulator Importu Pojazdów</h1>
      <p class="subtitle">Precyzyjnie oblicz całkowity koszt importu wymarzonego samochodu lub motocykla z Japonii i USA do Polski.</p>
    </header>

    <main class="main-content">
      <section class="intro-section">
        <h2 class="section-title">Twój Klucz do Importu Bez Niespodzianek</h2>
        <div class="accent-line"></div>
        <p class="intro-text">
          Masz dość niepewności przy imporcie pojazdu? Nasze kalkulatory online precyzyjnie oszacują wszystkie koszty importu aut i motocykli z Japonii oraz Stanów Zjednoczonych. Od cła, przez VAT i akcyzę, aż po dodatkowe opłaty – wszystko w jednym miejscu, z aktualnymi kursami walut NBP. Wybierz rynek i zacznij świadome planowanie!
        </p>
        <div class="calculator-links">
          <router-link to="/import-japonia" class="btn-calculate">
            Kalkulator importu z Japonii
          </router-link>
          <router-link to="/import-usa" class="btn-calculate">
            Kalkulator importu z USA
          </router-link>
        </div>
      </section>
    </main>

    <!-- Ad Placeholder Commented Out
    <div class="ad-container" :class="{ 'slide-down': showAd }">
      <div class="ad-placeholder">
        <span>Miejsce na reklamę</span>
      </div>
    </div>
    -->

    <footer class="footer">
      <p>© {{ new Date().getFullYear() }} Import Calculator | Kursy walut pobierane z NBP API</p>
      <p class="disclaimer">Kalkulacje mają charakter szacunkowy. Faktyczne koszty mogą się różnić.</p>
    </footer>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #f8f9fa; /* Light gray background */
  color: #212529; /* Darker text color for better contrast */
  line-height: 1.6;
}

.landing-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 1140px; /* Max width for larger screens */
  margin: 0 auto;
  padding: 1.5rem; /* Responsive padding */
}

.header {
  text-align: center;
  padding: 2rem 0; /* More vertical padding */
  margin-bottom: 2.5rem; /* Increased bottom margin */
}

.header h1 {
  font-size: 2.75rem; /* Increased font size */
  font-weight: 700; /* Bolder */
  color: #343a40; /* Darker heading color */
  margin-bottom: 0.75rem;
}

.subtitle {
  font-size: 1.15rem; /* Slightly larger subtitle */
  color: #495057; /* Softer color for subtitle */
  max-width: 700px;
  margin: 0 auto 1.5rem auto; /* Centered with bottom margin */
}

.main-content {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  width: 100%;
}

.intro-section {
  background-color: #ffffff; /* White background for content card */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); /* Softer, modern shadow */
  padding: 2.5rem; /* Increased padding */
  width: 100%;
  max-width: 720px; /* Optimal width for readability */
  text-align: center; /* Center text within the card */
}

.section-title {
  font-size: 1.75rem; /* Larger section title */
  font-weight: 600;
  color: #343a40;
  margin-bottom: 0.75rem; /* Adjusted margin */
}

.accent-line {
  width: 60px; /* Wider accent line */
  height: 4px; /* Thicker line */
  background-color: #007bff; /* Modern blue accent */
  margin: 0 auto 1.75rem auto; /* Centered with increased bottom margin */
  border-radius: 2px;
}

.intro-text {
  font-size: 1.05rem; /* Slightly larger intro text */
  color: #495057;
  margin-bottom: 2rem; /* Increased margin */
  line-height: 1.7; /* Improved line height */
}

.calculator-links {
  display: grid;
  grid-template-columns: 1fr; /* Default to single column */
  gap: 1rem; /* Space between buttons */
}

.btn-calculate {
  display: block;
  padding: 0.875rem 1.75rem; /* Generous padding */
  border: none;
  border-radius: 6px; /* Rounded corners */
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease;
  background-color: #007bff; /* Primary button blue */
  color: white;
  text-align: center;
  text-decoration: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-calculate:hover {
  background-color: #0056b3; /* Darker blue on hover */
  transform: translateY(-2px); /* Slight lift on hover */
}

.btn-calculate:active {
  background-color: #004085; /* Even darker on active/click */
  transform: translateY(-1px);
}

/* Ad placeholder styling - commented out as the ad itself is commented out
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
  background-color: #e9ecef; 
  padding: 1rem;
  text-align: center;
  border-radius: 8px;
  font-size: 1rem;
  color: #6c757d; 
}
*/

.footer {
  text-align: center;
  padding: 2rem 0;
  font-size: 0.9rem;
  color: #6c757d; /* Softer footer text color */
  margin-top: 3rem; /* More space above footer */
  border-top: 1px solid #dee2e6; /* Subtle top border */
}

.disclaimer {
  font-size: 0.8rem; /* Smaller disclaimer */
  font-style: italic;
  margin-top: 0.5rem;
  color: #868e96; /* Even softer color for disclaimer */
}

/* Responsive Adjustments */
@media (min-width: 768px) {
  .calculator-links {
    grid-template-columns: 1fr 1fr; /* Two columns on larger screens */
    gap: 1.5rem; /* Increased gap for two columns */
  }

  .intro-section {
    padding: 3rem;
  }
}

@media (max-width: 767px) {
  .header h1 {
    font-size: 2.25rem; /* Adjusted for smaller screens */
  }

  .subtitle {
    font-size: 1rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .intro-section {
    padding: 2rem 1.5rem; /* Adjust padding for smaller screens */
  }

  .btn-calculate {
    padding: 0.8rem 1.25rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .landing-container {
    padding: 1rem;
  }
  
  .header h1 {
    font-size: 1.85rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .section-title {
    font-size: 1.35rem;
  }

  .intro-text {
    font-size: 0.95rem;
  }

  .intro-section {
    padding: 1.5rem 1rem;
  }
}
</style>