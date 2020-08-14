LocationDialog = {};

LocationDialog.GetLocation = function(callback){
    FormItInterface.CallMethod("LocationDialog.GetLocation", "", function(locationJSON){
        callback(JSON.parse(locationJSON));
    });
}

LocationDialog.Cancel = function(){
    PluginDialog.Close();
}

LocationDialog.GetSatelliteImageData = function(callback){
    FormItInterface.CallMethod("LocationDialog.GetSatelliteImageData", "", function(imageData){

        if (!imageData || imageData === "undefined"){
            callback();            
        }else{
            callback(JSON.parse(imageData));
        }
    });
}

LocationDialog.SaveLocation = function(address, latitude, longitude){
    let args = {
        "address": address,
        "latitude": latitude,
        "longitude": longitude
    };

    FormItInterface.CallMethod("LocationDialog.SaveLocation", args);
    PluginDialog.Close();
}

LocationDialog.FinishImport = function(importSettings){
    FormItInterface.CallMethod("LocationDialog.FinishImport", importSettings);
    PluginDialog.Close();
}

LocationDialog.ShowNotification = function(messageObj){
    FormItInterface.CallMethod("LocationDialog.ShowNotification", messageObj);
}

LocationDialog.IsImperialUnitType = function(callback){
    FormItInterface.CallMethod(
        "LocationDialog.IsImperialUnitType",
        "",
        function(result){
            callback(JSON.parse(result));
        }
    );
}

LocationDialog.FetchNearestWeatherStations = function(locationObj, callback){
    FormItInterface.CallMethod(
        "LocationDialog.FetchNearestWeatherStations",
        locationObj,
        function(result){
            callback(JSON.parse(result));
        }
    );
}

LocationDialog.FetchDashboardWidgets = function (callback){
    FormItInterface.CallMethod(
        "LocationDialog.FetchDashboardWidgets",
        "",
        function(result){
            callback(JSON.parse(result));
        }
    );
}

LocationDialog.FetchWidgetsForStation = function (stationId, widgetIds, widgetVersions, callback){
    const args = {
        stationId,
        widgetIds,
        widgetVersions
    };

    FormItInterface.CallMethod(
        "LocationDialog.FetchWidgetsForStation",
        args,
        function(result){
            callback(JSON.parse(result));
        }
    );
}

LocationDialog.CheckLogin = function (callback){
    FormItInterface.CallMethod(
        "LocationDialog.CheckLogin",
        "",
        function(result){
            callback(JSON.parse(result));
        }
    );
}

LocationDialog.PromptSignIn = function (){
    FormItInterface.CallMethod("LocationDialog.PromptSignIn", "");
}