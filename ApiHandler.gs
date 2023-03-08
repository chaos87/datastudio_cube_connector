function getDataFromAPI(request, endpoint, options){
    let apiResponse;
    let url;
    if ('payload' in options) {
      url = [baseURL, '/', endpoint, options['payload']].join('')
    } else {
      url = [baseURL, '/', endpoint].join('')
    }
    try {
        var encoded = stringToMd5String(url);
        const cache = new DataCache(CacheService.getScriptCache(), encoded);
        const cacheHit = fetchFromCache(cache);
        if(cacheHit && endpoint !== 'meta'){
           console.log('Returning cache object')
            return cacheHit
        }
        let flagSuccess = false;
        while(!flagSuccess){
          apiResponse = fetchDataFromApi(request, endpoint, options);
          var json = apiResponse.getContentText();
          var data = JSON.parse(json);
          if (!('error' in data && data['error'] === 'Continue wait')){
            flagSuccess = true;
          }
        }
        if ('data' in data){
          data = data['data']
        }
        setInCache(data, cache);
        return data;
    } catch (e) {
        cc.newUserError()
            .setDebugText('Error fetching data from API. Exception details: ' + e)
            .setText(
                'The connector has encountered an unrecoverable error. Please try again later, or file an issue if this error persists.'
            )
            .throwException();
    }
}

/**
 * Gets response for UrlFetchApp.
 *
 * @param {Object} request Data request parameters.
 * @returns {string} Response text for UrlFetchApp.
 */
function fetchDataFromApi(request, endpoint, options){
    const response = UrlFetchApp.fetch([baseURL, '/', endpoint].join(''), options);
    return response;
}

/**
 * Formats the parsed response from external data source into correct tabular
 * format and returns only the requestedFields
 *
 * @param {Object} parsedResponse The response string from external data source
 *     parsed into an object in a standard format.
 * @param {Array} requestedFields The fields requested in the getData request.
 * @returns {Array} Array containing rows of data in key-value pairs for each
 *     field.
 */
function getFormattedData(response, querySchema, timeDimensionField, timeGrain){
    let requestedFieldsAsArray = querySchema.map(field => field['name']);
    let responseDateFormatted;
    if (timeDimensionField && timeGrain != 'none') {
      responseDateFormatted = response.map(function(data){
        data[timeDimensionField] = data[timeDimensionField].split('T')[0].replaceAll('-', '');
        return data
      })
    } else {
      responseDateFormatted = response;
    }
    const formattedData = responseDateFormatted.map(function (result){
        return {values: Object.values(_.pick(result, requestedFieldsAsArray)).map(f => '' + f)}
    });
    return formattedData;
}