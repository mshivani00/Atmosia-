const form=document.getElementById("searchForm");
const input=document.getElementById("cityInput");
const button=document.getElementById("searchBtn");
const statusEl=document.getElementById("status");
const panel=document.getElementById("weatherPanel");
const welcome=document.getElementById("welcome");

const codes={
  0:["☀️","Clear sky"],1:["🌤️","Mainly clear"],2:["⛅","Partly cloudy"],3:["☁️","Overcast"],
  45:["🌫️","Fog"],48:["🌫️","Rime fog"],51:["🌦️","Light drizzle"],53:["🌦️","Drizzle"],
  55:["🌧️","Heavy drizzle"],56:["🌧️","Freezing drizzle"],57:["🌧️","Heavy freezing drizzle"],
  61:["🌦️","Light rain"],63:["🌧️","Rain"],65:["🌧️","Heavy rain"],66:["🌧️","Freezing rain"],
  67:["🌧️","Heavy freezing rain"],71:["🌨️","Light snow"],73:["❄️","Snow"],75:["❄️","Heavy snow"],
  77:["❄️","Snow grains"],80:["🌦️","Rain showers"],81:["🌧️","Rain showers"],82:["⛈️","Heavy showers"],
  85:["🌨️","Snow showers"],86:["❄️","Heavy snow showers"],95:["⛈️","Thunderstorm"],
  96:["⛈️","Thunderstorm + hail"],99:["⛈️","Thunderstorm + heavy hail"]
};

function weather(code){return codes[code]||["🌥️","Mixed conditions"]}

function localDate(date){
  return new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
}
function shortDate(date){
  return new Date(date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function dayName(date){
  return new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short"});
}

async function fetchJSON(url){
  const response=await fetch(url,{headers:{"Accept":"application/json"}});
  if(!response.ok) throw new Error(`Weather service error (${response.status}).`);
  const data=await response.json();
  if(data.error) throw new Error(data.reason||"Weather service returned an error.");
  return data;
}

async function findCity(city){
  const url=new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name",city);
  url.searchParams.set("count","1");
  url.searchParams.set("language","en");
  url.searchParams.set("format","json");
  return fetchJSON(url).then(data=>{
    if(!data.results?.length) throw new Error("City not found. Try a different spelling.");
    return data.results[0];
  });
}

async function getWeather(lat,lon){
  const url=new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude",lat);
  url.searchParams.set("longitude",lon);
  url.searchParams.set("timezone","auto");
  url.searchParams.set("past_days","5");
  url.searchParams.set("forecast_days","1");
  url.searchParams.set("current","temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,visibility");
  url.searchParams.set("daily","weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  return fetchJSON(url);
}

function render(place,data){
  const c=data.current;
  const today=c.time.slice(0,10);
  const [icon,label]=weather(c.weather_code);

  document.getElementById("cityName").textContent=`${place.name}${place.country_code?`, ${place.country_code}`:""}`;
  document.getElementById("localDate").textContent=localDate(today);
  document.getElementById("currentIcon").textContent=icon;
  document.getElementById("temperature").textContent=`${Math.round(c.temperature_2m)}°`;
  document.getElementById("condition").textContent=label;
  document.getElementById("feelsLike").textContent=`${Math.round(c.apparent_temperature)}°`;
  document.getElementById("humidity").textContent=`${Math.round(c.relative_humidity_2m)}%`;
  document.getElementById("wind").textContent=`${Math.round(c.wind_speed_10m)} km/h`;
  document.getElementById("pressure").textContent=`${Math.round(c.pressure_msl)} hPa`;
  document.getElementById("visibility").textContent=c.visibility==null?"—":`${(c.visibility/1000).toFixed(1)} km`;
  document.getElementById("timezone").textContent=data.timezone_abbreviation||data.timezone;

  const grid=document.getElementById("forecastGrid");
  grid.innerHTML="";
  data.daily.time.forEach((date,i)=>{
    const [dayIcon,dayLabel]=weather(data.daily.weather_code[i]);
    const isToday=date===today;
    const card=document.createElement("article");
    card.className=`day-card${isToday?" today":""}`;
    card.innerHTML=`
      <div class="day">${isToday?"Today":dayName(date)}</div>
      <div class="date">${shortDate(date)}</div>
      <div class="weather-icon" title="${dayLabel}">${dayIcon}</div>
      <div><span class="hi">${Math.round(data.daily.temperature_2m_max[i])}°</span><span class="lo">${Math.round(data.daily.temperature_2m_min[i])}°</span></div>
      <div class="rain">💧 ${Math.round(data.daily.precipitation_probability_max?.[i]??0)}% rain</div>`;
    grid.appendChild(card);
  });

  panel.classList.remove("hidden");
  welcome.classList.add("hidden");
}

async function loadCity(city){
  button.disabled=true;
  statusEl.textContent="Loading live weather...";
  try{
    const place=await findCity(city);
    const data=await getWeather(place.latitude,place.longitude);
    render(place,data);
    statusEl.textContent="";
  }catch(error){
    panel.classList.add("hidden");
    welcome.classList.remove("hidden");
    statusEl.textContent=error.message.includes("Failed to fetch")
      ?"Could not connect to the weather service. Check your internet connection, then try again."
      :error.message;
  }finally{
    button.disabled=false;
  }
}

form.addEventListener("submit",e=>{
  e.preventDefault();
  const city=input.value.trim();
  if(city) loadCity(city);
});
document.querySelectorAll("[data-city]").forEach(b=>b.addEventListener("click",()=>{
  input.value=b.dataset.city;
  loadCity(b.dataset.city);
}));

// Try an initial city so the page is not empty.
loadCity("Bhubaneswar");
