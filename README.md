
# datastudio_cube_connector
Looker Studio connector for interacting with Cube API

The connector was built following this [guide](https://developers.google.com/looker-studio/connector/build) from Google

## Files

### appscript.json

The manifest file which contains connector informations that's displayed on the Connector list.

### Code.gs
This file implements the main functions from the Connector framework:
- getAuthType
- getConfig
- getSchema
- getData

### AuthHandler.gs

This file contains helper functions for authentication. I used oauth2 but you can use different authentication methods as listed in Datastudio connector docs.

### ApiHandler.gs

This file contains helper functions for building request payload, sending the request and formatting the response data.

### DataCache.gs

This file contains Datastudio cache helpers. I use it to cache request already processed.

### Utils.gs

Various helper functions.

### CubeConfig.gs

Cube specific variables such as API url.
