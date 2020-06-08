LocationDialog = {};
LocationDialog.PluginLocation = "PLUGINLOCATION";
LocationDialog.ShowDialog = function(){
    var dialogParams = {
        "DialogBoxGUID": "SetLocationPluginDialog",
        "PluginName": "Set Location",
        "DialogBox": "PLUGINLOCATION/location.html",
        "DialogBoxWidth": 1000,
        "DialogBoxHeight": 700,
        "DialogBoxType": "Modal"
    };

    const locationDialog = FormIt.CreateDialogBox(JSON.stringify(dialogParams));

    //only used by web.
    //a small hack until I find a better solution.
    //the situation is that Windows defines a PluginDialog.Close with QWebChannel. Web doesn't have this.
    //So for the web platform this is defined in FormItInterface.js. That function invokes this one.
    LocationDialog.Close = function() {
        locationDialog.dialog("destroy");
        locationDialog.remove();
    }
}

FormIt.Commands.RegisterJSCommand("LocationDialog.ShowDialog");

LocationDialog.GetLocation = function(){
    return FormIt.SunAndLocation.GetProjectAddress();
}

LocationDialog.SaveLocation = function(args){
    FormIt.SunAndLocation.SetLocation(args.longitude, args.latitude);
    FormIt.SunAndLocation.SetProjectAddress(args.address);
}

LocationDialog.FinishImport = function(importSettings){
    FormIt.SunAndLocation.AddSatelliteImage(
        importSettings.centerLat,
        importSettings.centerLon,
        importSettings.latSpan,
        importSettings.lonSpan,
        importSettings.pixelWidth,
        importSettings.pixelHeight,
        importSettings.physicalWidth,
        importSettings.physicalHeight,
        importSettings.address,
        importSettings.offsetX,
        importSettings.offsetY
    );
}

LocationDialog.GetSatelliteImageData = function(){
    const mainHistID = FormIt.Model.GetHistoryID();
    const imageDataArray = FormIt.ImageManager.GetAllImages(mainHistID, FormIt.SortOrder.Ascending);

    var satelliteImageData;
    imageDataArray.forEach(function(imgObjPair){
        const imgObj = imgObjPair.second;
        if (imgObj && imgObj.IsSatelliteImage){
            satelliteImageData = {
                lat: imgObj.Coordinates.x,
                lng: imgObj.Coordinates.y,
                zoom: imgObj.Zoom,
                corners: imgObj.Corners,
                size: imgObj.Size
            };
        }
    });

    return satelliteImageData;
}

LocationDialog.ShowNotification = function(messageObj){
    FormIt.UI.ShowNotification(messageObj.message, messageObj.type, messageObj.timeout || 0);
}

LocationDialog.IsImperialUnitType = function(){
    //return bool
    return !FormIt.Model.GetUnitTypeCurrent();
}

LocationDialog.FetchNearestWeatherStations = function(locationObj)
{
    return FormItHelpers.Plugins.FetchNearestWeatherStations(
        locationObj.latitude, locationObj.longitude);
}

LocationDialog.FetchDashboardWidgets = function()
{
    return FormItHelpers.Plugins.FetchDashboardWidgets();
}

LocationDialog.FetchWidgetsForStation = function (args)
{
    return FormItHelpers.Plugins.FetchWidgetsForStation(args.stationId, args.widgetIds, args.widgetVersions);
}

LocationDialog.CheckLogin = function()
{
    return !!FormItHelpers.Plugins.IsLoggedIn();
}

LocationDialog.PromptSignIn = function(){
    FormItHelpers.Plugins.PromptSignIn();
}