class FormItMap {
    constructor() {
        this._addressInput = document.getElementById('AddressInput');
        this._addressInputContainer = document.getElementById('LocationSearchContainer');
        this._importMapContainer = document.getElementById('ImportMapContainer');
        this._importMapControl = document.getElementById('ImportMapControl');

        this._locationMapControl = document.getElementById('LocationMapControl');

        this._importModeButtons = document.getElementById('ImportModeButtons');
        this._locationModeButtons = document.getElementById('LocationModeButtons');

        this._importButton = document.getElementById('StartImportButton');
        this._setLocationButton = document.getElementById('SetLocationButton');
        this._cancelLocationButton = document.getElementById('CancelLocationButton');

        this._finishImportButton = document.getElementById('FinishImportButton');
        this._cancelImportButton = document.getElementById('CancelImportButton');

        this._worldCenterOverlay = document.getElementById('WorldCenterImg');

        this._weatherGraphList = document.getElementById('WeatherGraphList');
        this._graphCloseButton = document.getElementById('GraphCloseButton');
        this._signInLink = document.getElementById('SignIn');

        this._languageInput = document.getElementById('LanguageInput');

        this._moveLocationToOriginInput = document.getElementById('MoveLocationToOrigin');
        this._moveLocationToOriginContainer = document.getElementById('MoveLocationToOriginContainer');
        this._moveLocationToOriginContainer.style.display = "none";

        this.initLanguageSettings();

        const spinner = new Spinner({
            lines: 12,
            length: 20,
            width: 10,
            radius: 30,
            corners: 0.5,
            rotate: 0,
            direction: 1,
            color: "#4675a8",
            speed: 0.5,
            trail: 60,
            shadow: false,
            hwaccel: false,
            zIndex: 2e9
        }).spin();

        this._loadingSpinner = document.getElementById('LoadingSpinner');
        this._loadingSpinner.appendChild(spinner.el);

        this._importButton.addEventListener('click', this._startImport.bind(this));
        this._finishImportButton.addEventListener('click', this._finishImport.bind(this));
        this._cancelImportButton.addEventListener('click', this._cancelImport.bind(this));

        this._setLocationButton.addEventListener('click', this._saveLocationOnly.bind(this));
        this._cancelLocationButton.addEventListener('click', this._cancelLocation.bind(this));

        this._graphCloseButton.addEventListener('click', this._deselectStation.bind(this));
        this._signInLink.addEventListener('click', this._signIn.bind(this));

        this._addressInput.addEventListener('keypress', (event) => {
            //enter key
            if (event.keyCode === 13) {
                //Bing maps does not provide any event hooks for autosuggest results. So just wait a brief time
                //to query results
                setTimeout(() => {
                    const suggestionResults = this._addressInputContainer.getElementsByClassName("suggestLink");

                    if (suggestionResults.length > 0) {

                        //Doesn't work. Why?!
                        //suggestionResults[0].click();
                        //So parsing out location strings to reverse goecode.
                        const addressLines = suggestionResults[0].getElementsByTagName('p');
                        this._address = addressLines[0].innerText + ", " + addressLines[1].innerText;
                        this._addressInput.value = this._address;
                        this._location = undefined;

                        this._geocodeLocationAddress(() => {
                            this._updatePushPin();
                            this._focusLocation();
                        });
                    } else {
                        //no results found by auto-suggest API, so try to geocode with exactly what the user gave us.
                        this._setAddress(this._addressInput.value);
                    }
                }, 100);
            }
        });

        this._weatherStationCache = {};
        this._allWeatherPins = [];

        this._isImporting = false;

        this._setLocationButton = document.getElementById('SetLocationButton');
        this._cancelLocationButton = document.getElementById('CancelLocationButton');

        this._maxMapImportSize = 640;

        //Boulder
        const defaultLocation = new Microsoft.Maps.Location(40.019253, -105.274239);

        this._locationMap = new Microsoft.Maps.Map('#LocationMapControl', {
            credentials: atob(not_important),
            mapTypeId: Microsoft.Maps.MapTypeId.aerial,
            location: defaultLocation,
            disableStreetside: true,
            disableBirdseye: true
        });

        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
            this._searchManager = new Microsoft.Maps.Search.SearchManager(this._locationMap);
        });

        Microsoft.Maps.loadModule('Microsoft.Maps.AutoSuggest', () => {
            const manager = new Microsoft.Maps.AutosuggestManager({ map: this._locationMap });
            manager.attachAutosuggest('#AddressInput', '#LocationSearchContainer', this._searchLocationSelected.bind(this));
        });

        Microsoft.Maps.loadModule('Microsoft.Maps.SpatialMath', () => {});

        this._importMap = new Microsoft.Maps.Map('#ImportMapControl', {
            mapTypeId: Microsoft.Maps.MapTypeId.aerial,
            showDashboard: false,
            disableStreetside: true
        });

        this._importMap.setView({
            labelOverlay: Microsoft.Maps.LabelOverlay.hidden,
            zoom: 18
        });

        Microsoft.Maps.Events.addHandler(this._importMap, 'viewchange', () => {
            this._syncLocationMap();
        });

        //May be a useful feature in future
        //Microsoft.Maps.Events.addHandler(this._importMap, 'click', this._handleWorldCenterClick.bind(this));

        Microsoft.Maps.Events.addHandler(this._locationMap, 'mapresize', () => {
            this._handleResize();
        });

        Microsoft.Maps.Events.addHandler(this._locationMap, 'viewchange', () => {
            this._deactivateAllPins();
            this._deselectStation();
        });

        //Fix for resize bug FORMIT-9236
        //https://social.msdn.microsoft.com/Forums/SECURITY/en-US/fa924dad-fab4-46ad-b5d6-cecdeb9721c7/bing-map-control-v8-returns-wrong-values-after-resize?forum=bingmapsajax
        this._handleResize();

        this.init();
    }

    init() {
        const intervalId = window.setInterval(() => {
            //pluginInterfaceReady flag set in FormItInterface.Initialize handler
            if (window.pluginInterfaceReady) {
                window.clearInterval(intervalId);

                this.resetAddress();
                this.useLastLocation();

                const loginCheckCallback = (isLoggedIn) => {
                    if (isLoggedIn) {
                        this._handleLoggedIn();
                    } else {
                        this._handleLoggedOut();
                    }
                }

                LocationDialog.CheckLogin(loginCheckCallback);
            }
        }, 100);
    }

    initLanguageSettings() {
        //List from here:
        //https://docs.microsoft.com/en-us/bingmaps/v8-web-control/creating-and-hosting-map-controls/setting-map-control-parameters
        const supportedLanguages = {
            "Select an option": "",
            "Arabic - Saudi Arabia": "ar-SA",
            "Basque": "eu",
            "Bulgarian": "bg",
            "Bulgarian - Bulgaria": "bg-BG",
            "Catalan Spanish": "ca",
            "Central Kurdish": "ku-Arab",
            "Chinese - China": "zh-CN",
            "Chinese - Hong Kong": "zh-HK",
            "Chinese - Simplified": "zh-Hans",
            "Chinese - Taiwan": "zh-TW",
            "Chinese - Traditional": "zh-Hant",
            "Czech": "cs",
            "Czech - Czech Republic": "cs-CZ",
            "Danish": "da",
            "Danish - Denmark": "da-DK",
            "Dutch - Belgium": "nl-BE",
            "Dutch - Netherlands": "nl",
            "Dutch - Netherlands (nl-NL)": "nl-NL",
            "English - Australia": "en-AU",
            "English - Canada": "en-CA",
            "English - India": "en-IN",
            "English - United Kingdom": "en-GB",
            "English - United States": "en-US",
            "Finnish": "fi",
            "Finnish - Finland": "fi-FI",
            "French - Belgium": "fr-BE",
            "French - Canada": "fr-CA",
            "French - France": "fr",
            "French - France (fr-FR)": "fr-FR",
            "French - Switzerland": "fr-CH",
            "Galician": "gl",
            "German - Germany": "de",
            "German - Germany (de-DE)": "de-DE",
            "Greek": "el",
            "Hebrew": "he",
            "Hebrew - Israel": "he-IL",
            "Hindi": "hi",
            "Hindi - India": "hi-IN",
            "Hungarian": "hu",
            "Hungarian - Hungary": "hu-HU",
            "Icelandic": "is",
            "Icelandic - Iceland": "is-IS",
            "Italian - Italy": "it",
            "Italian - Italy (it-IT)": "it-IT",
            "Japanese": "ja",
            "Japanese - Japan": "ja-JP",
            "Korean": "ko",
            "Korean - Korea": "Ko-KR",
            "Kyrgyz": "ky-Cyrl",
            "Latvian": "lv",
            "Latvian - Latvia": "lv-LV",
            "Lithuanian": "lt",
            "Lithuanian - Lithuania": "lt-LT",
            "Norwegian - Bokmål": "nb",
            "Norwegian - Bokmål - Norway": "nb-NO",
            "Norwegian - Nynorsk": "nn",
            "Polish": "pl",
            "Polish - Poland": "pl-PL",
            "Portuguese - Brazil": "pt-BR",
            "Portuguese - Portugal": "pt-PT",
            "Russian": "ru",
            "Russian - Russia": "ru-RU",
            "Spanish - Mexico": "es-MX",
            "Spanish - Spain": "es",
            "Spanish - Spain (es-ES)": "es-ES",
            "Spanish - United States": "es-US",
            "Swedish - Sweden": "sv",
            "Swedish - Sweden (sv-SE)": "sv-SE",
            "Tatar - Cyrillic": "tt-Cyrl",
            "Thai": "th",
            "Thai - Thailand": "th-TH",
            "Turkish": "tr",
            "Turkish - Turkey": "tr-TR",
            "Ukrainian": "uk",
            "Ukrainian - Ukraine": "uk-UA",
            "Uyghur": "ug-Arab",
            "Valencian": "ca-ES-valencia",
            "Vietnamese": "vi",
            "Vietnamese - Vietnam": "vi-VN"
        };

        const qsParams = new URLSearchParams(window.location.search);
        let selectedLang = qsParams.get("BingMapsLang") || "";

        try {
            selectedLang = window.localStorage.getItem("BingMapsLang");
        } catch (e) {
            console.log('localStorage is disabled');
        }

        Object.keys(supportedLanguages).forEach((key) => {
            const value = supportedLanguages[key];

            const option = document.createElement("option");
            option.innerHTML = key;
            option.value = value;

            if (value === selectedLang) {
                option.selected = "selected";
            }

            this._languageInput.appendChild(option);
        });

        this._languageInput.addEventListener('change', (e) => {
            //to make selection sticky
            try {
                window.localStorage.setItem("BingMapsLang", e.target.value);
            } catch (e) {
                console.log('localStorage is disabled');
            }

            const qsParams = new URLSearchParams(window.location.search);
            qsParams.set("BingMapsLang", e.target.value);

            //reload
            window.location.href = `${window.location.href.split('?')[0]}?${qsParams.toString()}`;
        });
    }

    resetAddress() {
        this._location = undefined;
        this._address = "";
        this._addressInput.value = "";

        //Really annoying bug with Bing maps...
        //on first load, if we try to query bing apis from map control and the map isn't rendered,
        //the userMapView size will be invalid and bing APIs will fail.
        //  From Bing http response: "userMapView: This parameter value is out of range."
        //So just put a little timeout to give the map some time to load.

        //Is there an event hook to know if Bing maps is ready? Apparently not!
        //https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-api/map-class#events
        window.setTimeout(() => {
            LocationDialog.GetLocation((address) => {
                if(address) {
                    this._addressInput.value = address;
                }
            });
        }, 100)
    }

    resetWeatherStationData() {
        this._weatherStationCache = {};
        this._deactivateAllPins();
        this._deselectStation();
    }

    useLastLocation() {
        LocationDialog.GetSatelliteImageData((imageData) => {
            if (imageData) {
                this._moveLocationToOriginContainer.style.display = "inline";
                const importCenter = new Microsoft.Maps.Location(imageData.lat, imageData.lng);

                this._locationMap.setView({
                    center: importCenter,
                    zoom: imageData.zoom
                });
            } else {
                this._moveLocationToOriginInput.checked = true;
            }
        });
    }

    _handleLoggedIn() {
        document.getElementById("NotSignedInState").classList.add("none");
        document.getElementById("GraphState").classList.add("none");

        document.getElementById("NoLocationState").classList.remove("none");
        document.getElementById("NoStationState").classList.remove("none");

        this._showWeatherStations();
    }

    _handleLoggedOut() {
        document.getElementById("NotSignedInState").classList.remove("none");

        document.getElementById("NoStationState").classList.add("none");
        document.getElementById("NoLocationState").classList.add("none");
        document.getElementById("GraphState").classList.add("none");

        this._deselectStation();
        this._removeAllStationPins();
    }

    _setAddress(address) {
        if (!address) {
            return;
        }

        //FORMIT-9271 handle addresses formatted Latitude: <val>, Longitude: <val>
        if (address.startsWith('Latitude')) {
            const longLat = address.replace(/[^0-9$.,-]/g, '').split(',')
            this._location = new Microsoft.Maps.Location(Number(longLat[0]), Number(longLat[1]));
            this._updatePushPin();
            this._focusLocation();
        } else {
            this._address = address;
            this._addressInput.value = address;
            this._location = undefined;

            this._geocodeLocationAddress(() => {
                this._updatePushPin();
                this._focusLocation();
            });
        }
    }

    _geocode(address, callback) {
        if (address && address !== "") {
            //handle case when search manager is not loaded.
            const searchManagerIntervalId = window.setInterval(() => {
                if (this._searchManager) {
                    window.clearInterval(searchManagerIntervalId);

                    this._searchManager.geocode({
                        count: 1,
                        callback: callback,
                        errorCallback: (error) => {
                            console.log(`Geocode error looking up address ${JSON.stringify(error)}`);
                        },
                        where: address
                    });
                } else {
                    console.log("Location plugin - waiting for search manager to be initialized.")
                }
            }, 100);
        }
    }

    _reverseGeocode(latitude, longitude, callback) {
        //handle case when search manager is not loaded.
        const searchManagerIntervalId = window.setInterval(() => {
            if (this._searchManager) {
                window.clearInterval(searchManagerIntervalId);

                this._searchManager.reverseGeocode({
                    location: new Microsoft.Maps.Location(latitude, longitude),
                    callback: callback,
                    count: 1,
                    errorCallback: (error) => {
                        console.log(`Reverse geocode error looking up by location ${JSON.stringify(error)}`);
                    }
                });
            } else {
                console.log("Location plugin - waiting for search manager to be initialized.")
            }
        }, 100);
    }

    _geocodeLocationAddress(callback) {
        if (!this._address && this._location) {
            this._reverseGeocode(this._location.latitude, this._location.longitude, (result) => {
                this._address = result.name;
                callback();
            });
        } else if (this._address && !this._location) {
            this._geocode(this._address, (result) => {
                this._location = result.results[0].location;
                callback();
            });
        } else {
            callback();
        }
    }

    _startImport() {
        this._isImporting = true;
        this._importMapContainer.style.display = 'block';
        this._importModeButtons.style.display = 'block';
        this._locationModeButtons.style.display = 'none';
        this._locationMapControl.classList = 'importMode';
        this._hideRightPanel();
        this._deselectStation();

        LocationDialog.GetSatelliteImageData((imageData) => {
            this._importMap.setView({
                center: this._locationMap.getCenter(),
                zoom: this._locationMap.getZoom()
            });

            const showWorldCenter = () => {
                this._worldCenterOverlay.style.display = 'block';
                this._unsetWorldCenter();
                this._moveLocationToOriginInput.checked = true;
            }

            const hideWorldCenter = (worldCenter) => {
                this._worldCenterOverlay.style.display = 'none';
                this._setWorldCenter(worldCenter);
                this._moveLocationToOriginInput.checked = false;
            }

            if (imageData) {

                const corners = imageData.corners;
                const offsetX = imageData.size.x / 2 + corners[0].x;
                const offsetY = imageData.size.y / 2 + corners[0].y;

                const earthRadius = Microsoft.Maps.SpatialMath.getEarthRadius(Microsoft.Maps.SpatialMath.DistanceUnits.Meters);
                const metersToFeet = 3.28;

                //equation from https://stackoverflow.com/questions/2839533/adding-distance-to-a-gps-coordinate
                const worldCenterLat = imageData.lat - (180 / Math.PI) * ((offsetY / metersToFeet) / earthRadius);
                const worldCenterLng = imageData.lng - (180 / Math.PI) *
                    ((offsetX / metersToFeet) / earthRadius) / Math.cos(Math.PI / 180.0 * imageData.lat);

                const worldCenter = new Microsoft.Maps.Location(worldCenterLat, worldCenterLng);

                this._moveLocationToOriginInput.addEventListener("click", () => {
                    if(this._moveLocationToOriginInput.checked) {
                        showWorldCenter();
                    } else {
                        hideWorldCenter(worldCenter);
                    }
                });

                const bounds = this._importMap.getBounds();
                const isVisible = bounds.contains(worldCenter);

                if(!isVisible) {
                    showWorldCenter();
                } else {
                    hideWorldCenter(worldCenter);
                }
            } else {
                showWorldCenter();
            }
        });
    }

    //FORMIT-9364 - Handling for when Bing maps static API imagery is unavailable due to unsupported zoom level
    //Reference to related forums topic:
    //https://social.msdn.microsoft.com/Forums/en-US/2429c48c-975a-4666-b729-c38342add2c7/max-zoom-level-for-static-aerial-map-with-rest-imagery-api?forum=bingmapsservices

    //Recursively find a valid zoom level, then set it.
    _getValidZoomLevelForImport(zoomLevel) {
        return new Promise((resolve, reject) => {
            const centerLat = this._importMap.getCenter().latitude;
            const centerLon = this._importMap.getCenter().longitude;
            const key = atob(not_important);
            const url = `https://dev.virtualearth.net/REST/v1/Imagery/BasicMetadata/Aerial/${centerLat},${centerLon}?zoomLevel=${zoomLevel}&key=${key}`;

            fetch(url)
                .then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    } else {
                        throw new Error('Bing BasicMetadata response error');
                    }
                })
                .then((responseJSON) => {
                    if (responseJSON &&
                        responseJSON.resourceSets[0] &&
                        responseJSON.resourceSets[0].resources[0] &&
                        responseJSON.resourceSets[0].resources[0].vintageStart) {

                        const desiredZoom = this._importMap.getZoom();

                        if (desiredZoom !== zoomLevel) {
                            this._importMap.setView({
                                zoom: zoomLevel
                            });

                            LocationDialog.ShowNotification({
                                message: "The selected zoom level was not available in Bing Maps, so the satellite image has been zoomed out slightly.",
                                type: 2
                            });
                        }

                        resolve();
                    } else {
                        resolve(this._getValidZoomLevelForImport(zoomLevel - 1));
                    }
                }).catch((err) => {
                    reject(err);
                });
        });
    }

    _finishImport() {
        const completeImport = (isMovingOriginToCenterOfImport) => {
            this._isImporting = false;

            //FORMIT-9751 Bing Maps occasionally gives float instead of int for zoomLevel
            const zoom = Math.floor(this._importMap.getZoom());

            this._getValidZoomLevelForImport(zoom).then(() => {
                const mapCenter = this._importMap.getCenter();
                const centerLat = mapCenter.latitude;
                const centerLon = mapCenter.longitude;

                //Get current UI pixel size, but clamp to 640x640
                let pixelWidth = this._importMapControl.clientWidth;
                let pixelHeight = this._importMapControl.clientHeight;

                const bounds = this._importMap.getBounds();

                const west = bounds.getNorthwest().latitude;
                const east = bounds.getSoutheast().latitude;
                const north = bounds.getSoutheast().longitude;
                const south = bounds.getNorthwest().longitude;

                const latSpan = west - east;
                const lonSpan = north - south;

                if (pixelWidth > 640) {
                    latSpan *= 640 / pixelWidth;
                    pixelWidth = 640;
                }

                if (pixelHeight > 640) {
                    lonSpan *= 640 / pixelHeight;
                    pixelHeight = 640;
                }

                const westPt = new Microsoft.Maps.Location(centerLat - latSpan / 2, centerLon);
                const eastPt = new Microsoft.Maps.Location(centerLat + latSpan / 2, centerLon);
                const northPt = new Microsoft.Maps.Location(centerLat, centerLon + lonSpan / 2);
                const southPt = new Microsoft.Maps.Location(centerLat, centerLon - lonSpan / 2);

                Microsoft.Maps.loadModule('Microsoft.Maps.SpatialMath', () => {
                    const meterWidth = Microsoft.Maps.SpatialMath.getDistanceTo(westPt, eastPt);
                    const meterHeight = Microsoft.Maps.SpatialMath.getDistanceTo(northPt, southPt);

                    //formit internal unit is in feet
                    const metersToFeet = 3.28;
                    const physicalWidth = meterWidth * metersToFeet;
                    const physicalHeight = meterHeight * metersToFeet;

                    let offsetY;
                    let offsetX;

                    if (this._currentWorldCenter && !isMovingOriginToCenterOfImport) {
                        offsetY = Microsoft.Maps.SpatialMath.getDistanceTo(
                            mapCenter,
                            new Microsoft.Maps.Location(this._currentWorldCenter.latitude, centerLon),
                            Microsoft.Maps.SpatialMath.DistanceUnits.Feet
                        );

                        //second get distance in longitude
                        offsetX = Microsoft.Maps.SpatialMath.getDistanceTo(
                            mapCenter,
                            new Microsoft.Maps.Location(centerLat, this._currentWorldCenter.longitude),
                            Microsoft.Maps.SpatialMath.DistanceUnits.Feet
                        );

                        if (this._currentWorldCenter.longitude > centerLon) {
                            offsetX = -offsetX;
                        }

                        if (this._currentWorldCenter.latitude > centerLat) {
                            offsetY = -offsetY;
                        }
                    }

                    const finishedHandler = () => {

                        LocationDialog.FinishImport({
                            centerLat,
                            centerLon,
                            latSpan: Math.abs(latSpan),
                            lonSpan: Math.abs(lonSpan),
                            pixelWidth,
                            pixelHeight,
                            physicalWidth,
                            physicalHeight,
                            offsetY,
                            offsetX,
                            // `|| ""` Fixes "ERROR: FormIt.SunAndLocation.AddSatelliteImage unable to
                            // retrieve address of type std::string" when this._address is undefined.
                            address: this._address || "" 
                        });

                        this._importMapContainer.style.display = 'none';
                        this._importModeButtons.style.display = 'none';
                        this._locationModeButtons.style.display = 'block';
                        this._locationMapControl.classList = '';
                        this._showRightPanel();
                    }

                    LocationDialog.GetLocation((address) => {
                        const isValidAddress = address && !address.startsWith('Latitude');

                        if (isValidAddress) {
                            finishedHandler();
                        } else {
                            this._reverseGeocode(centerLat, centerLon, (result) => {
                                this._address = result.name;
                                this._location = new Microsoft.Maps.Location(centerLat, centerLon);
                                this._addressInput.value = this._address;
                                this._updatePushPin();
                                this._focusLocation();
                                finishedHandler();
                            });
                        }
                    });
                });
            }).catch((err) => {
                console.log(err);
            });
        }

        //If a user has already imported a satellite image, check to see that the world center pin in within view.
        //If it's not within view, prompt the user to confirm if they would like to continue. This may mean 
        //that they will be importing a satellite image far away from the world center.
        if (this._worldCenterPin) {
            const bounds = this._importMap.getBounds();
            const isVisible = bounds.contains(this._worldCenterPin.getLocation());

            if (!isVisible) {
                $("#satellite-confirm").dialog({
                    resizable: false,
                    height: "auto",
                    width: 500,
                    modal: true,
                    buttons: [{
                            text: 'Move Location to Origin',
                            id: 'ImportOrigin',
                            click: function() {
                                completeImport(true);
                                $(this).dialog("close");
                            }
                        },
                        {
                            text: 'Keep Location Relative',
                            id: 'ImportRelative',
                            click: function() {
                                completeImport(false);
                                $(this).dialog("close");
                            }
                        }
                    ]
                });
            } else {
                completeImport(this._moveLocationToOriginInput.checked);
            }
        } else {
            completeImport(this._moveLocationToOriginInput.checked);
        }
    }

    _cancelImport() {
        this._isImporting = false;
        this._importMapContainer.style.display = 'none';
        this._importModeButtons.style.display = 'none';
        this._locationModeButtons.style.display = 'block';
        this._locationMapControl.classList = '';
        this._showRightPanel();
    }

    //May be useful feature in the future...
    /*_handleWorldCenterClick(e){
        //set world center marker
        const clickedPoint = new Microsoft.Maps.Point(e.getX(), e.getY());
        const clickedLocation = e.target.tryPixelToLocation(clickedPoint);
        this._currentWorldCenter = clickedLocation;
        this._setWorldCenter(clickedLocation);
    }*/

    _setWorldCenter(location) {
        this._currentWorldCenter = location;

        this._importMap.entities.clear();

        const icon = document.getElementById("WorldCenterImg").src;

        this._worldCenterPin = new Microsoft.Maps.Pushpin(location, {
            icon: icon,
            width: 40,
            height: 40,
            anchor: new Microsoft.Maps.Point(20, 20)
        });

        const tooltip = new Microsoft.Maps.Infobox(this._importMap.getCenter(), {
            visible: false,
            showPointer: false,
            offset: new Microsoft.Maps.Point(15, -35)
        });

        const tooltipTemplate = '<div style="border:solid 1px black;font-size:14px;background-color:white;height:14px;width:90px;padding:1px;text-align:center">World center</div>';

        tooltip.setMap(this._importMap);

        Microsoft.Maps.Events.addHandler(this._worldCenterPin, 'mouseover', () => {
            tooltip.setOptions({
                location: location,
                htmlContent: tooltipTemplate,
                visible: true
            });
        });

        Microsoft.Maps.Events.addHandler(this._worldCenterPin, 'mouseout', () => {
            tooltip.setOptions({
                visible: false
            });
        });

        this._importMap.entities.push(this._worldCenterPin);
    }

    _unsetWorldCenter() {
        this._currentWorldCenter = undefined;
        this._importMap.entities.clear();
        this._worldCenterPin = undefined;
    }

    _saveLocationOnly() {
        if (!this._address && !this._location) {

            LocationDialog.ShowNotification({
                message: "Please choose a location",
                type: 3,
            });

            return;
        }

        this._geocodeLocationAddress(() => {
            LocationDialog.SaveLocation(this._address, this._location.latitude, this._location.longitude);
        });
    }

    _cancelLocation() {
        PluginDialog.Close("LocationDialog");
    }

    _focusLocation() {
        //immediate feedback
        this._locationMap.setView({
            center: this._location,
            zoom: 18
        });

        LocationDialog.CheckLogin((isLoggedIn) => {
            if (isLoggedIn) {
                this._showWeatherStations();
            }
        });
    }

    _searchLocationSelected(result) {
        this._address = result.formattedSuggestion;
        this._location = result.location

        this._updatePushPin();
        this._focusLocation();
    }

    _updatePushPin() {
        this._locationMap.entities.clear();

        this._locationPin = new Microsoft.Maps.Pushpin(this._location, {
            color: '#f00',
            draggable: true
        });

        this._locationMap.entities.push(this._locationPin);

        Microsoft.Maps.Events.addHandler(this._locationPin, 'dragend', () => {
            this._location = this._locationPin.getLocation();
            this._address = "";
            this._focusLocation();
            this._geocodeLocationAddress(() => {
                this._addressInput.value = this._address;
            });
        })
    }

    _handleResize() {
        if (this._isImporting) {
            const minLength = Math.min(window.innerHeight - 41, window.innerWidth - 41, this._maxMapImportSize);

            //keep import map square by minium length
            this._importMapControl.style.height = `${minLength}px`;
            this._importMapControl.style.width = `${minLength}px`;

            this._importMap.setView({
                width: minLength,
                height: minLength
            });
        }
    }

    _syncLocationMap() {
        if (this._isImporting) {
            //keep location map in sync
            this._locationMap.setView({
                center: this._importMap.getCenter(),
                zoom: this._importMap.getZoom()
            });
        }
    }

    _showWeatherStations() {
        this._removeAllStationPins();

        if (!this._location) {
            document.getElementById("NoLocationState").classList.remove("none");
            document.getElementById("NoStationState").classList.add("none");
        } else {
            document.getElementById("NoLocationState").classList.add("none");
            document.getElementById("NoStationState").classList.remove("none");

            const renderWeatherStationsCallback = (weatherStationsResult) => {
                const weatherStationLocations = [];

                weatherStationsResult.forEach((station) => {
                    weatherStationLocations.push(new Microsoft.Maps.Location(station.latitude, station.longitude));
                    this._addStationMarker(station);
                });
            }

            LocationDialog.FetchNearestWeatherStations(this._location, renderWeatherStationsCallback);
        }
    }

    _addStationMarker(station) {
        const icon = document.getElementById("StationMarkerImg").src;
        const hoverIcon = document.getElementById("StationMarkerHoverImg").src;
        const stationLatLng = new Microsoft.Maps.Location(station.latitude, station.longitude)
        const pin = new Microsoft.Maps.Pushpin(stationLatLng, {
            icon: icon
        });

        pin.isActive = false;
        pin.stationLocation = stationLatLng;

        this._locationMap.entities.push(pin);

        Microsoft.Maps.Events.addHandler(pin, 'mouseover', (e) => {
            e.target.setOptions({ icon: hoverIcon });
        });

        Microsoft.Maps.Events.addHandler(pin, 'mouseout', (e) => {
            if (!pin.isActive) {
                e.target.setOptions({ icon: icon });
            }
        });

        Microsoft.Maps.Events.addHandler(pin, 'click', (e) => {
            this._deactivateAllPins();

            e.target.setOptions({ icon: hoverIcon });
            pin.isActive = true;

            this._selectStation();
            this._zoomToPin(pin);

            this._showStation(station, stationLatLng);
        });

        this._allWeatherPins.push(pin);
    }

    _deactivateAllPins() {
        const icon = document.getElementById("StationMarkerImg").src;

        this._allWeatherPins.forEach((pin) => {
            pin.setOptions({ icon: icon });
            pin.isActive = false;
        });
    }

    _removeAllStationPins() {
        this._allWeatherPins.forEach((pin) => {
            this._locationMap.entities.remove(pin);
        });
    }

    _zoomToPin(pin) {
        this._locationMap.setView({
            center: pin.stationLocation,
            centerOffset: new Microsoft.Maps.Point(-200, 0)
        });
    }

    _showStation(station, stationLatLng) {
        //clear everything for previous station
        document.getElementById('WeatherGraphDisplay').innerHTML = '';
        document.getElementById('WeatherGraphName').innerHTML = '';
        this._loadingSpinner.classList.remove('none');
        this._weatherGraphList.innerHTML = '';

        let distance;
        let distanceString;
        const distanceInMeters = Microsoft.Maps.SpatialMath.getDistanceTo(
            this._location,
            stationLatLng,
            Microsoft.Maps.SpatialMath.DistanceUnits.Meters
        );

        const heading = Microsoft.Maps.SpatialMath.getHeading(this._location, stationLatLng);

        const cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
        const cardinal = cardinals[Math.round((heading % 360) / 45)];

        const renderDistanceCallback = (isImperialUnitType) => {
            if (isImperialUnitType) {
                distance = (distanceInMeters * 0.000621371).toFixed(1);
                distanceString = cardinal + " " + distance + " miles away";
            } else {
                distance = (distanceInMeters / 1000).toFixed(1);
                distanceString = cardinal + " " + distance + " km away";
            }

            document.getElementById("StationId").innerHTML = station.stationId;
            document.getElementById("WeatherStationDistance").innerHTML = distanceString;
        }

        LocationDialog.IsImperialUnitType(renderDistanceCallback);

        const callback = (result) => {
            const dashboardsResult = result;
            const rendererResources = dashboardsResult.renderer;
            const jsResource = rendererResources.url;

            const cssResource = rendererResources.fullCSSUrl;
            const generatorVersion = dashboardsResult.generatorVersion;
            const dashboards = dashboardsResult.dashboards[0];
            const widgets = dashboards.dashboardWidgets;

            const widgetNameMap = {};

            widgets.forEach((widgetObj) => widgetNameMap[widgetObj.widget.key.id] = {
                id: widgetObj.widget.key.id,
                name: widgetObj.widget.name
            });

            if (!window["Solon"]) {
                const script = document.createElement("script");
                script.type = "text/javascript";
                script.src = jsResource;
                document.body.appendChild(script);
            }

            if (!document.getElementById("SolonCSS")) {
                const cssLink = document.createElement("link");
                cssLink.id = "SolonCSS"
                cssLink.type = "text/css";
                cssLink.rel = "stylesheet";
                cssLink.href = cssResource;

                document.head.appendChild(cssLink);
            }

            const intervalId = window.setInterval(() => {
                if (window["Solon"]) {
                    window.clearInterval(intervalId);

                    const widgetIds = [];
                    const widgetVersions = [];

                    widgets.forEach((widgetObj) => {
                        widgetIds.push(widgetObj.widget.key.id);
                        widgetVersions.push(widgetObj.widget.key.version);
                    })

                    this._requestWidgetsForStation(station.stationId, widgetIds.join(','), widgetVersions.join(','));
                }
            }, 100);
        }

        LocationDialog.FetchDashboardWidgets(callback);
    }

    _requestWidgetsForStation(stationId, widgetIds, widgetVersions) {
        const callback = (result) => {
            this._weatherStationCache[stationId] = result.widgets;

            this._loadWidgets(result.widgets)
        }

        if (this._weatherStationCache[stationId]) {
            this._loadWidgets(this._weatherStationCache[stationId]);
        } else {
            LocationDialog.FetchWidgetsForStation(`${stationId}`, widgetIds, widgetVersions, callback);
        }
    }

    _loadWidgets(widgets) {
        //render the first graph
        this._renderMainGraph(JSON.parse(widgets[0].data).widgetMetaData.name, widgets[0].data);

        //delete previous widgets
        this._weatherGraphList.innerHTML = '';

        //render all the other graphs
        widgets.forEach((widget) => {
            const graphName = JSON.parse(widget.data).widgetMetaData.name;
            const widgetId = widget.widgetKey.id;
            const graphPreviewEl = document.createElement("li");
            graphPreviewEl.classList = "weatherGraphPreviewContainer";

            graphPreviewEl.addEventListener("click", () => {
                const graphPreviews = document.getElementsByClassName('weatherGraphPreviewContainer');
                //HTMLCollection does not inherit from Array, use for loop.
                for (let i = 0; i < graphPreviews.length; i++) {
                    graphPreviews[i].classList.remove('active');
                }

                graphPreviewEl.classList.add('active');
                this._renderMainGraph(graphName, widget.data);
            });

            const graphNameEl = document.createElement("div");
            graphNameEl.classList = "weatherGraphPreviewName";
            graphNameEl.innerHTML = graphName;

            const graphEl = document.createElement("div");
            graphEl.id = "widget" + widgetId;
            graphEl.classList = "weatherGraphPreview";

            graphPreviewEl.appendChild(graphNameEl);
            graphPreviewEl.appendChild(graphEl);

            this._weatherGraphList.appendChild(graphPreviewEl);

            Solon.Renderer.renderWidget("widget" + widgetId, widget.data, {
                renderingDefaults: {
                    exporting: {
                        enabled: false
                    }
                }
            });
        });
    }

    _renderMainGraph(name, graphData) {
        this._loadingSpinner.classList.add('none');
        document.getElementById("WeatherGraphName").innerHTML = name;
        document.getElementById("WeatherGraphDisplay").innerHTML = "";

        Solon.Renderer.renderWidget("WeatherGraphDisplay", graphData, {
            renderingDefaults: {
                exporting: {
                    enabled: false
                }
            }
        });
    }

    _deselectStation() {
        this._deactivateAllPins();

        document.getElementById("WeatherGraphDisplayContainer").classList.add("none");
        document.getElementById("GraphState").classList.add("none");

        this._weatherGraphList.innerHTML = '';
    }

    _selectStation() {
        document.getElementById("WeatherGraphDisplayContainer").classList.remove("none");
        document.getElementById("GraphState").classList.remove("none");
    }

    _hideRightPanel() {
        document.getElementById("RightPanel").classList.add("none");
    }

    _showRightPanel() {
        document.getElementById("RightPanel").classList.remove("none");
    }

    _signIn() {
        LocationDialog.PromptSignIn();
    }
}

//global object needed so bing can properly load
//defined in Bing library url param "callback"
window.FormItMapGlobalInit = () => {
    new FormItMap();
}

//fgnass.github.com/spin.js#v1.3.3
! function(a, b) { "object" == typeof exports ? module.exports = b() : "function" == typeof define && define.amd ? define(b) : a.Spinner = b() }(this, function() { "use strict";

    function a(a, b) { var c, d = document.createElement(a || "div"); for (c in b) d[c] = b[c]; return d }

    function b(a) { for (var b = 1, c = arguments.length; c > b; b++) a.appendChild(arguments[b]); return a }

    function c(a, b, c, d) { var e = ["opacity", b, ~~(100 * a), c, d].join("-"),
            f = .01 + c / d * 100,
            g = Math.max(1 - (1 - a) / b * (100 - f), a),
            h = k.substring(0, k.indexOf("Animation")).toLowerCase(),
            i = h && "-" + h + "-" || ""; return m[e] || (n.insertRule("@" + i + "keyframes " + e + "{0%{opacity:" + g + "}" + f + "%{opacity:" + a + "}" + (f + .01) + "%{opacity:1}" + (f + b) % 100 + "%{opacity:" + a + "}100%{opacity:" + g + "}}", n.cssRules.length), m[e] = 1), e }

    function d(a, b) { var c, d, e = a.style; for (b = b.charAt(0).toUpperCase() + b.slice(1), d = 0; d < l.length; d++)
            if (c = l[d] + b, void 0 !== e[c]) return c;
        return void 0 !== e[b] ? b : void 0 }

    function e(a, b) { for (var c in b) a.style[d(a, c) || c] = b[c]; return a }

    function f(a) { for (var b = 1; b < arguments.length; b++) { var c = arguments[b]; for (var d in c) void 0 === a[d] && (a[d] = c[d]) } return a }

    function g(a) { for (var b = { x: a.offsetLeft, y: a.offsetTop }; a = a.offsetParent;) b.x += a.offsetLeft, b.y += a.offsetTop; return b }

    function h(a, b) { return "string" == typeof a ? a : a[b % a.length] }

    function i(a) { return "undefined" == typeof this ? new i(a) : (this.opts = f(a || {}, i.defaults, o), void 0) }

    function j() {
        function c(b, c) { return a("<" + b + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', c) }
        n.addRule(".spin-vml", "behavior:url(#default#VML)"), i.prototype.lines = function(a, d) {
            function f() { return e(c("group", { coordsize: k + " " + k, coordorigin: -j + " " + -j }), { width: k, height: k }) }

            function g(a, g, i) { b(m, b(e(f(), { rotation: 360 / d.lines * a + "deg", left: ~~g }), b(e(c("roundrect", { arcsize: d.corners }), { width: j, height: d.width, left: d.radius, top: -d.width >> 1, filter: i }), c("fill", { color: h(d.color, a), opacity: d.opacity }), c("stroke", { opacity: 0 })))) } var i, j = d.length + d.width,
                k = 2 * j,
                l = 2 * -(d.width + d.length) + "px",
                m = e(f(), { position: "absolute", top: l, left: l }); if (d.shadow)
                for (i = 1; i <= d.lines; i++) g(i, -2, "progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)"); for (i = 1; i <= d.lines; i++) g(i); return b(a, m) }, i.prototype.opacity = function(a, b, c, d) { var e = a.firstChild;
            d = d.shadow && d.lines || 0, e && b + d < e.childNodes.length && (e = e.childNodes[b + d], e = e && e.firstChild, e = e && e.firstChild, e && (e.opacity = c)) } } var k, l = ["webkit", "Moz", "ms", "O"],
        m = {},
        n = function() { var c = a("style", { type: "text/css" }); return b(document.getElementsByTagName("head")[0], c), c.sheet || c.styleSheet }(),
        o = { lines: 12, length: 7, width: 5, radius: 10, rotate: 0, corners: 1, color: "#000", direction: 1, speed: 1, trail: 100, opacity: .25, fps: 20, zIndex: 2e9, className: "spinner", top: "auto", left: "auto", position: "relative" };
    i.defaults = {}, f(i.prototype, { spin: function(b) { this.stop(); var c, d, f = this,
                h = f.opts,
                i = f.el = e(a(0, { className: h.className }), { position: h.position, width: 0, zIndex: h.zIndex }),
                j = h.radius + h.length + h.width; if (b && (b.insertBefore(i, b.firstChild || null), d = g(b), c = g(i), e(i, { left: ("auto" == h.left ? d.x - c.x + (b.offsetWidth >> 1) : parseInt(h.left, 10) + j) + "px", top: ("auto" == h.top ? d.y - c.y + (b.offsetHeight >> 1) : parseInt(h.top, 10) + j) + "px" })), i.setAttribute("role", "progressbar"), f.lines(i, f.opts), !k) { var l, m = 0,
                    n = (h.lines - 1) * (1 - h.direction) / 2,
                    o = h.fps,
                    p = o / h.speed,
                    q = (1 - h.opacity) / (p * h.trail / 100),
                    r = p / h.lines;! function s() { m++; for (var a = 0; a < h.lines; a++) l = Math.max(1 - (m + (h.lines - a) * r) % p * q, h.opacity), f.opacity(i, a * h.direction + n, l, h);
                    f.timeout = f.el && setTimeout(s, ~~(1e3 / o)) }() } return f }, stop: function() { var a = this.el; return a && (clearTimeout(this.timeout), a.parentNode && a.parentNode.removeChild(a), this.el = void 0), this }, lines: function(d, f) {
            function g(b, c) { return e(a(), { position: "absolute", width: f.length + f.width + "px", height: f.width + "px", background: b, boxShadow: c, transformOrigin: "left", transform: "rotate(" + ~~(360 / f.lines * j + f.rotate) + "deg) translate(" + f.radius + "px,0)", borderRadius: (f.corners * f.width >> 1) + "px" }) } for (var i, j = 0, l = (f.lines - 1) * (1 - f.direction) / 2; j < f.lines; j++) i = e(a(), { position: "absolute", top: 1 + ~(f.width / 2) + "px", transform: f.hwaccel ? "translate3d(0,0,0)" : "", opacity: f.opacity, animation: k && c(f.opacity, f.trail, l + j * f.direction, f.lines) + " " + 1 / f.speed + "s linear infinite" }), f.shadow && b(i, e(g("#000", "0 0 4px #000"), { top: "2px" })), b(d, b(i, g(h(f.color, j), "0 0 1px rgba(0,0,0,.1)"))); return d }, opacity: function(a, b, c) { b < a.childNodes.length && (a.childNodes[b].style.opacity = c) } }); var p = e(a("group"), { behavior: "url(#default#VML)" }); return !d(p, "transform") && p.adj ? j() : k = d(p, "animation"), i });