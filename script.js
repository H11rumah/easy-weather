"use strict";

let searchField = document.getElementById("city");
let searchHints = document.getElementById("hints");
let searchButton = document.getElementById("search");

let settings = document.getElementById("settings");

let settingsPeriod = document.getElementById("period");
let settingsCount = document.getElementById("count");
let settingsTemperature = document.getElementById("temperature");
let settingsWind = document.getElementById("wind");

let savesFields = document.getElementById("saves_fields");

let cityName = document.getElementById("city_name");

let saveCityButton = document.getElementById("save_city_button");

let weatherCards = document.getElementById("weather_cards");

let countOptions = count.querySelectorAll("option");

let currentShowedPeriod;
let currentShowedCount;
let currentShowedTemperature;
let currentShowedWind;

let token =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9wZmEuZm9yZWNhLmNvbVwvYXV0aG9yaXplXC90b2tlbiIsImlhdCI6MTcwNzk4OTc4NSwiZXhwIjo5OTk5OTk5OTk5LCJuYmYiOjE3MDc5ODk3ODUsImp0aSI6ImE2MzViMzc2MGYzYzNkYmIiLCJzdWIiOiJuZXJhaml2NTI4IiwiZm10IjoiWERjT2hqQzQwK0FMamxZVHRqYk9pQT09In0.SNmNh63hETnAMMZ4NMnumF9RjbdzPQfkaFMrag4k4BQ";

let hintsTimer;

let findedLocations = [];
let selectedLocationId;

let options = {
    method: "GET",
    headers: {},
};

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

document.addEventListener("click", (event) => {
    if (event.target.classList.contains("opener")) {
        event.target.parentElement.classList.toggle("opened");
    }
});

searchField.addEventListener("keyup", getHints);
searchField.addEventListener("search", () => {
    searchHints.classList.add("hidden");
});
searchField.addEventListener("click", (event) => {
    event.target.classList.remove("required");
});

searchButton.addEventListener("click", search);

searchHints.addEventListener("click", selectHint);

settings.addEventListener("change", settingsValidate);

saveCityButton.addEventListener("click", saveCity);

savesFields.addEventListener("click", loadSave);
savesFields.addEventListener("click", deleteSave);

loadSavesFromStorage();

/////////////////////////////////
/////////////////////////////////
/////////////////////////////////

function settingsValidate(event) {
    let target = event.target;

    if (target === period) {
        switch (target[target.selectedIndex].value) {
            case "days":
                openCountOptions();
                break;
            case "threedays":
            case "week":
            case "twoweeks":
                closeCountOptions();
                settingsCount.selectedIndex = 0;
                break;
        }
    }
}

function openCountOptions() {
    countOptions.forEach((elem) => {
        elem.removeAttribute("disabled");
    });
}

function closeCountOptions() {
    countOptions.forEach((elem) => {
        elem.setAttribute("disabled", "true");
    });
}

function saveCity() {
    if (!localStorage.getItem("savedCities")) {
        localStorage.setItem("savedCities", JSON.stringify({}));
    }

    let saves = JSON.parse(localStorage.getItem("savedCities"));

    if (!saves[`${selectedLocationId}${currentShowedPeriod}${currentShowedCount}`]) {
        saves[`${selectedLocationId}${currentShowedPeriod}${currentShowedCount}`] = {
            cityId: selectedLocationId,
            cityName: cityName.innerHTML,
            period: currentShowedPeriod,
            count: currentShowedCount,
            temp: currentShowedTemperature,
            wind: currentShowedWind,
        };

        localStorage.setItem("savedCities", JSON.stringify(saves));

        createSaveField(null);
    }
}

function createSaveField(saveFromStorage) {
    let save = document.createElement("div");
    save.classList.add("save");
    save.dataset.saveId = saveFromStorage
        ? `${saveFromStorage.cityId}${saveFromStorage.period}${saveFromStorage.count}`
        : `${selectedLocationId}${currentShowedPeriod}${currentShowedCount}`;

    let saveText = document.createElement("span");
    saveText.classList.add("save_city_name");

    saveText.innerHTML = `${saveFromStorage ? saveFromStorage.cityName : cityName.innerHTML}`;

    switch (saveFromStorage ? saveFromStorage.period : currentShowedPeriod) {
        case "days":
            saveText.innerHTML += `, ${saveFromStorage ? saveFromStorage.count : currentShowedCount} Days`;
            break;
        case "threedays":
            saveText.innerHTML += `, 3 Days`;
            break;
        case "week":
            saveText.innerHTML += `, 1 Week`;
            break;
        case "twoweeks":
            saveText.innerHTML += `, 2 Weeks`;
            break;
    }

    save.append(saveText);

    saveText = document.createElement("span");
    saveText.classList.add("save_remove_button");
    saveText.innerHTML = "X";

    save.append(saveText);

    savesFields.append(save);
}

function loadSave(event) {
    let target = event.target;

    if (target.classList.contains("save_city_name")) {
        search(null, JSON.parse(localStorage.getItem("savedCities"))[target.parentElement.dataset.saveId]);
    }
}

function loadSavesFromStorage() {
    let saves = JSON.parse(localStorage.getItem("savedCities"));

    console.log(saves);

    for (let id in saves) {
        createSaveField(saves[id]);
    }
}

function deleteSave(event) {
    let target = event.target;

    if (target.classList.contains("save_remove_button")) {
        let saves = JSON.parse(localStorage.getItem("savedCities"));

        delete saves[target.parentElement.dataset.saveId];

        localStorage.setItem("savedCities", JSON.stringify(saves));

        target.parentElement.classList.add("save_delete_anim");

        setTimeout(() => {
            target.parentElement.remove();
        }, 400);
    }
}

function showWeatherCards(forecastDaily, forecastThreehourly) {
    forecastDaily.forEach((forecastDay) => {
        weatherCards.append(createWeatherCard(forecastDay, forecastThreehourly));
    });
}

async function search(event, save) {
    if (!save && (searchField.value === "Not found" || searchField.value.length < 3 || !searchHints.classList.contains("hidden"))) {
        searchField.classList.add("required");
        return;
    }

    cityName.innerHTML = save ? save.cityName : searchField.value;

    saveCityButton.classList.remove("hidden");

    searchField.value = "";

    weatherCards.innerHTML = "";

    currentShowedPeriod = save ? save.period : settingsPeriod.value;
    currentShowedCount = save ? save.count : settingsCount.value;
    currentShowedTemperature = save ? save.temp : settingsTemperature.value;
    currentShowedWind = save ? save.wind : settingsWind.value;

    console.log(save);

    let response = await fetch(createSearchLink(false, save), options);

    let forecastDaily = await response.json();
    forecastDaily = forecastDaily.forecast;

    response = await fetch(createSearchLink(true, save), options);

    let forecastThreehourly = await response.json();
    forecastThreehourly = forecastThreehourly.forecast;

    showWeatherCards(forecastDaily, forecastThreehourly);
}

function createSearchLink(threehourly, settings) {
    let period = "daily";
    let count = settings ? settings.count : settingsCount.value;
    let temperature = settings ? settings.temp : settingsTemperature.value;
    let wind = settings ? settings.wind : settingsWind.value;

    switch (settings ? settings.period : settingsPeriod.value) {
        case "threedays":
            count = 3;
            break;
        case "week":
            count = 7;
            break;
        case "twoweeks":
            count = 14;
            break;
    }

    let url;

    if (threehourly) {
        count *= 8;
        period = "3hourly";
    }

    url = `https://pfa.foreca.com/api/v1/forecast/${period}/${
        settings ? settings.cityId : selectedLocationId
    }?dataset=full&windunit=${wind}&tempunit=${temperature}&periods=${count}&token=${token}`;

    return url;
}

function selectHint(event) {
    let target = event.target;

    if (target.classList.contains("hint")) {
        searchHints.classList.add("hidden");

        searchField.classList.remove("required");

        searchField.value = target.innerHTML;

        let selectedLocation = Array.from(searchHints.querySelectorAll(".hint")).findIndex((elem) => {
            return elem === target;
        });

        selectedLocationId = findedLocations[selectedLocation].id;
    }
}

function getHints() {
    clearTimeout(hintsTimer);

    if (searchField.value.length >= 3) {
        hintsTimer = setTimeout(async () => {
            let response = await fetch(`https://pfa.foreca.com/api/v1/location/search/${searchField.value}?token=${token}`, options);
            let result = await response.json();

            searchHints.classList.remove("hidden");

            findedLocations = result.locations;

            showHints(findedLocations);
        }, 400);
    } else {
        searchHints.classList.add("hidden");
    }
}

function showHints(locations) {
    searchHints.innerHTML = "";

    if (!locations.length) {
        searchHints.append(createHint("Not found"));
        return;
    }

    locations.forEach((elem) => {
        let locationName = `${elem.name}, ${elem.adminArea}, ${elem.country}`;

        searchHints.append(createHint(locationName));
        searchHints.append(createDivider());
    });
}

function createHint(locationName) {
    let div = document.createElement("div");
    div.classList.add("hint");
    div.innerHTML = locationName;

    return div;
}

function createDivider() {
    let div = document.createElement("div");
    div.classList.add("divider");

    return div;
}

function createWeatherCard(forecastDay, forecastThreehourly) {
    let weatherCard = document.createElement("div");
    weatherCard.classList.add("weather_card");

    let date = document.createElement("div");
    date.classList.add("date");
    date.innerHTML = forecastDay.date;

    ////////////////////////////////

    let divider = document.createElement("div");
    divider.classList.add("divider");

    ////////////////////////////////

    let symbolTempWindInfo = document.createElement("div");
    symbolTempWindInfo.classList.add("symbol_temp_wind_info");

    let symbol = document.createElement("img");
    symbol.src = `./imgs/${forecastDay.symbol}.png`;
    symbol.alt = "symbol";
    symbol.classList.add("symbol");

    ///////////////

    let temp = document.createElement("div");
    temp.classList.add("temp");

    let dayTemp = document.createElement("div");
    dayTemp.classList.add("day_temp");
    dayTemp.innerHTML = +forecastDay.maxTemp > 0 ? `+${forecastDay.maxTemp}` : forecastDay.maxTemp;

    let nightTemp = document.createElement("div");
    nightTemp.classList.add("night_temp");
    nightTemp.innerHTML = +forecastDay.minTemp > 0 ? `+${forecastDay.minTemp}` : forecastDay.minTemp;

    temp.append(dayTemp);
    temp.append(nightTemp);

    ///////////////

    let windInfo = document.createElement("div");
    windInfo.classList.add("wind_info");

    let windSpeed = document.createElement("div");

    ///////

    let windSymbol = document.createElement("img");
    windSymbol.width = "30";
    windSymbol.src = "./imgs/wind.svg";
    windSymbol.alt = "wind";

    ///////

    let windText = document.createElement("span");
    windText.innerHTML = `${forecastDay.maxWindSpeed} ${currentShowedWind}`;

    windSpeed.append(windSymbol);
    windSpeed.append(windText);

    ///////////////

    let windDir = document.createElement("div");

    let windDirSymbol = document.createElement("img");
    windDirSymbol.width = "30";

    let windDirDegrees = +forecastDay.windDir;
    let imgLink;
    let windDirName;

    if (windDirDegrees > 338 || windDirDegrees <= 22) {
        windDirName = "N";
        imgLink = "./imgs/arrow_up.svg";
    } else if (windDirDegrees > 22 && windDirDegrees <= 67) {
        windDirName = "NE";
        imgLink = "./imgs/arrow_right_up.svg";
    } else if (windDirDegrees > 67 && windDirDegrees <= 112) {
        windDirName = "E";
        imgLink = "./imgs/arrow_right.svg";
    } else if (windDirDegrees > 112 && windDirDegrees <= 157) {
        windDirName = "SE";
        imgLink = "./imgs/arrow_right_down.svg";
    } else if (windDirDegrees > 157 && windDirDegrees <= 202) {
        windDirName = "S";
        imgLink = "./imgs/arrow_down.svg";
    } else if (windDirDegrees > 202 && windDirDegrees <= 247) {
        windDirName = "SW";
        imgLink = "./imgs/arrow_left_down.svg";
    } else if (windDirDegrees > 247 && windDirDegrees <= 292) {
        windDirName = "W";
        imgLink = "./imgs/arrow_left.svg";
    } else if (windDirDegrees > 292 && windDirDegrees <= 338) {
        windDirName = "WN";
        imgLink = "./imgs/arrow_left_up.svg";
    }

    windDirSymbol.src = imgLink;
    windDirSymbol.alt = "dir";

    let windDirText = document.createElement("span");
    windDirText.innerHTML = `${windDirName}`;

    windDir.append(windDirSymbol);
    windDir.append(windDirText);

    ///////////////

    let windDirDeg = document.createElement("div");

    let windDirDegText = document.createElement("span");
    windDirDegText.innerHTML = `Deg °${forecastDay.windDir}`;

    windDirDeg.append(windDirDegText);

    windInfo.append(windSpeed);
    windInfo.append(windDir);
    windInfo.append(windDirDeg);

    symbolTempWindInfo.append(symbol);
    symbolTempWindInfo.append(temp);
    symbolTempWindInfo.append(windInfo);

    let threehourlyTempInfo = document.createElement("div");
    threehourlyTempInfo.classList.add("threehourly_temp_info");

    for (let i = 0; i < forecastThreehourly.length; i++) {
        if (forecastDay.date === forecastThreehourly[i].time.slice(0, 10)) {
            let threehourlyTemp = document.createElement("threehourly_temp");
            threehourlyTemp.classList.add("threehourly_temp");

            let threehourlyTempText = document.createElement("span");
            threehourlyTempText.innerHTML = `${forecastThreehourly[i].time.slice(11, 13)}h`;

            threehourlyTemp.append(threehourlyTempText);

            threehourlyTempText = document.createElement("span");
            threehourlyTempText.innerHTML =
                forecastThreehourly[i].temperature > 0 ? `+${forecastThreehourly[i].temperature}` : forecastThreehourly[i].temperature;

            threehourlyTemp.append(threehourlyTempText);

            let threehourlyTempImg = document.createElement("img");
            threehourlyTempImg.width = "30";
            threehourlyTempImg.src = `./imgs/${forecastThreehourly[i].symbol}.png`;
            threehourlyTempImg.alt = "img";

            threehourlyTemp.append(threehourlyTempImg);

            let divider = document.createElement("div");
            divider.classList.add("divider");

            threehourlyTempInfo.append(threehourlyTemp);
            threehourlyTempInfo.append(divider);
        } else {
            continue;
        }
    }

    weatherCard.append(date);
    weatherCard.append(divider);
    weatherCard.append(symbolTempWindInfo);

    divider = document.createElement("div");
    divider.classList.add("divider");

    weatherCard.append(divider);
    weatherCard.append(threehourlyTempInfo);

    return weatherCard;
}
