const cc = DataStudioApp.createCommunityConnector();
const _ = LodashGS.load();

/**
 * Returns the Auth Type of this connector.
 * @return {object} The Auth type.
 */
function getAuthType() {
  return cc.newAuthTypeResponse()
      .setAuthType(cc.AuthType.OAUTH2)
      .build();
}

function getConfig(request) {
  var config = cc.getConfig();
  var configParams = request.configParams;
  var response = getDataFromAPI(request, 'meta', {headers: {Authorization: getOAuthService().getAccessToken()}});
  // Metrics dropdown
  config.newInfo()
    .setId('instructions')
    .setText('Select your metrics');
  var metricsDropdown = config
      .newSelectMultiple()
      .setId('metrics')
      .setName('Metrics')
      .setHelpText('Select one or several metrics')
  response['cubes'].map(function(cube) {
    cube['measures'].map(function(measure){
      metricsDropdown.addOption(config.newOptionBuilder().setLabel(measure['title']).setValue(measure['name']))
    })
  })
  // Dimensions dropdown
  config.newInfo()
    .setId('instructions')
    .setText('Select your dimensions');
  var dimensionsDropdown = config
    .newSelectMultiple()
    .setId('dimensions')
    .setName('Dimensions')
    .setHelpText('Select one or several dimensions')
  response['cubes'].map(function(cube) {
    cube['dimensions'].map(function(dimension){
        if (dimension['isVisible'] && dimension['type'] !== 'time'){
          dimensionsDropdown.addOption(config.newOptionBuilder().setLabel(dimension['title']).setValue(dimension['name']))
        }
    })
  })
  // Time grain 
  config.newInfo()
  .setId('instructions')
  .setText('Select a time grain (defaults to none = no breakdown along time dimension)');
  config.newInfo()
  .setId('instructions')
  .setText('The date dimension is automatically picked based on your metrics/dimensions of choice');
  config
    .newSelectSingle()
    .setId('timeGrain')
    .setName('Time Grain')
    .setHelpText('Needed to know how to break down the metric according to the time Dimension selected')
    .addOption(config.newOptionBuilder().setLabel('none').setValue('none'))
    .addOption(config.newOptionBuilder().setLabel('day').setValue('day'))
    .addOption(config.newOptionBuilder().setLabel('week').setValue('week'))
    .addOption(config.newOptionBuilder().setLabel('month').setValue('month'));
  config.newInfo()
  .setId('instructions')
  .setText('Select a preset date range (defaults to yesterday)');
  var dateRangeSelect = config
    .newSelectSingle()
    .setId('dateRange')
    .setName('Date Range')
    .setHelpText('You can change the date range later in your report')
  
  // Segments dropdown
  config.newInfo()
    .setId('instructions')
    .setText('Select your segments');
  var segmentsDropdown = config
    .newSelectMultiple()
    .setId('segments')
    .setName('Pre-defined segments')
    .setHelpText('Select one or several segments (they are additive)')
  response['cubes'].map(function(cube) {
    cube['segments'].map(function(segment){
        if (segment['isVisible']){
          segmentsDropdown.addOption(config.newOptionBuilder().setLabel(segment['title']).setValue(segment['name']))
        }
    })
  })
  
  dateRanges.forEach(function(value, index) {
    dateRangeSelect.addOption(config.newOptionBuilder().setLabel(value).setValue(value))
  })
  
  return config.build();
}

function getFields(request) {
  var fields = cc.getFields();
  var response = getDataFromAPI(request, 'meta', {headers: {Authorization: getOAuthService().getAccessToken()}});
  var dimensions = response['cubes'].map(function(cube) {
    return cube['dimensions'].filter(function(dimension) { return request.configParams.dimensions.split(',').indexOf(dimension['name']) != -1})
  }).flat();
  var metrics = response['cubes'].map(function(cube) {
    return cube['measures'].filter(function(measure) { return request.configParams.metrics.split(',').indexOf(measure['name']) != -1})
  }).flat();
  var timeDimensionId = getTimeDimensionToFilterOn(request.configParams.dimensions.split(',').concat(request.configParams.metrics.split(',')));
  var timeDimension = response['cubes'].map(function(cube) {
    return cube['dimensions'].filter(function(dimension) { return dimension['name'] === timeDimensionId})
  }).flat()[0];
  const types = cc.FieldType;
  dimensions.map(function (dimension){
        fields
            .newDimension()
            .setId(dimension['name'])
            .setName(dimension['title'])
            .setType(getType(dimension['type']));
    });
  if (request.configParams.timeGrain !== 'none'){
    fields
      .newDimension()
      .setId(timeDimensionId)
      .setName(timeDimension['title'])
      .setType(types.YEAR_MONTH_DAY)
      .setGroup('Date');
  }
  metrics.map(function (metric){
        fields
            .newMetric()
            .setId(metric['name'])
            .setName(metric['title'])
            .setType(getType(metric['type']))
    });
  return fields;
}

function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function getType(value){
    const types = cc.FieldType,
        typeMap = new Map();

    typeMap.set('number', types.NUMBER);
    typeMap.set('string', types.TEXT);
    typeMap.set('date', types.YEAR_MONTH_DAY);
    typeMap.set('time', types.YEAR_MONTH_DAY_SECOND);

    return typeMap.get(value);
}

function getData(request) {
  var requestedFieldIds = request.fields.map(function(field) {
    return field.name;
  });
  var timeDimension = 'Cube1.date'; // Default time dimension
  var requestedFields = getFields(request).forIds(requestedFieldIds);
  var requestedFieldsForPayload = requestedFields.build()
  var querySchema = requestedFieldsForPayload.filter(fi => !request.fields.filter(fi => 'forFilterOnly' in fi).map(fi => fi.name).includes(fi['name']));
  var dimensionsFilters = (request.dimensionsFilters || []).map(filterBlock => filterBlock.filter(obj => obj.operator !== 'IS_NULL')).flat();

  var payload = {};
  payload['measures'] = requestedFieldsForPayload.filter(function(field) {
    return field['semantics']['conceptType'] === 'METRIC'
  }).map(function(measure) {
    return measure['name']
  })
  payload['dimensions'] = requestedFieldsForPayload.filter(function(field) {
    return field['semantics']['conceptType'] === 'DIMENSION' 
            && field['semantics']['semanticType'] !== 'YEAR_MONTH_DAY_SECOND' 
            && field['semantics']['semanticType'] !== 'YEAR_MONTH_DAY' 
            && !request.fields.filter(fi => 'forFilterOnly' in fi).map(fi => fi.name).includes(field['name'])
  }).map(function(dimension) {
    return dimension['name']
  })
  const firstMetric = payload['measures'][0];
  var dateRange = request.configParams.dateRange === '' ? 'yesterday' : request.configParams.dateRange === 'all time' ? undefined : request.configParams.dateRange;
  var timeQuery = {
      "dimension": timeDimension,
      "dateRange": dateRange
    };
  let timeGrain = 'none';
  if ('timeGrain' in request.configParams && request.configParams.timeGrain !== 'none'){
    timeGrain = request.configParams.timeGrain;
    timeQuery['granularity'] = timeGrain;
    payload['order'] = {
      [timeDimension]: "desc"
    }
  } else {
    payload['order'] = {
      [firstMetric]: "desc"
    }
  }
  payload['timeDimensions'] = [timeQuery]
  if (request.configParams.segments){
    payload['segments'] = request.configParams.segments.split(',')
  }
  if (dimensionsFilters){
    payload['filters'] = dimensionsFilters.sort((a,b) => (a.member > b.member) ? 1 : ((b.member > a.member) ? -1 : 0)).map(dimFilter => {
      return {
        member: dimFilter['fieldName'],
        operator: dimFilter['type'] === 'EXCLUDE' ? 'notEquals' : 'equals',
        values: dimFilter['values']
      }
    })
  }
  // Fetch and parse data from API
  var requestOptions = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify({"query": payload}),
    headers: {Authorization: getOAuthService().getAccessToken()},
  };
  const apiResponse = getDataFromAPI(request, 'load', requestOptions);
  const data = getFormattedData(apiResponse, querySchema, timeDimension, timeGrain);
  console.log('requested fields: ', querySchema.map(field => field['name']), data.slice(0, 20));
  
  return {
    schema: querySchema,
    rows: data,
    filtersApplied: request.fields.filter(fi => 'forFilterOnly' in fi).length > 0
  };
}

function isAdminUser() {
  return true;
}