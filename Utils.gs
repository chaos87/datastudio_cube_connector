String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
};

function fetchFromCache(cache){
    let data = null;
    try {
        const dataString = cache.get();
        if(_.isEmpty(dataString))
            return false;
        data = JSON.parse(dataString);
        console.log('Fetched successfully from cache', data.length);
    } catch (e) {
        console.log('Error when fetching from cache:', e);
    }

    return data;
}

function setInCache(data, cache){
    console.log('Setting data to cache...');
    try {
        cache.set(JSON.stringify(data));
    } catch (e) {
        console.log('Error when storing in cache', e);
    }
}

function stringToMd5String(message){     
  var signature = Utilities.computeDigest(
                       Utilities.DigestAlgorithm.MD5,
                       message,
                       Utilities.Charset.US_ASCII);
  var signatureStr = '';
    for (i = 0; i < signature.length; i++) {
      var byte = signature[i];
      if (byte < 0)
        byte += 256;
      var byteStr = byte.toString(16);
      // Ensure we have 2 chars in our byte, pad with 0
      if (byteStr.length == 1) byteStr = '0'+byteStr;
      signatureStr += byteStr;
    }
  return signatureStr;
}