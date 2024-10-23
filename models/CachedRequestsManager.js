import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";

let cachedRequestsExpirationTime = serverVariables.get(
  "main.repository.CacheExpirationTime"
);

// Repository file data models cache
global.cachedRequests = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestsManager {
  static add(url, content, ETag = "") {
    if (!cachedRequestsCleanerStarted) {
      cachedRequestsCleanerStarted = true;
      CachedRequestsManager.startCachedRequestsCleaner();
    }
    if (url != "") {
      CachedRequestsManager.clear(url);
      cachedRequests.push({
        url,
        content,
        ETag,
        Expire_Time: utilities.nowInSeconds() + cachedRequestsExpirationTime,
      });
      console.log(
        BgWhite + FgBlue,
        `[Data of ${url} repository has been cached]`
      );
    }
  }
  static startCachedRequestsCleaner() {
    // periodic cleaning of expired cached repository data
    setInterval(
      CachedRequestsManager.flushExpired,
      cachedRequestsExpirationTime * 1000
    );
    console.log(
      BgWhite + FgBlue,
      "[Periodic repositories data caches cleaning process started...]"
    );
  }
  static clear(url) {
    if (url != "") {
      let indexToDelete = [];
      let index = 0;
      for (let cache of cachedRequests) {
        if (cache.url == url) indexToDelete.push(index);
        index++;
      }
      utilities.deleteByIndex(cachedRequests, indexToDelete);
    }
  }
  static find(url) {
    try {
      if (url != "") {
        for (let cache of cachedRequests) {
          if (cache.url == url) {
            // renew cache
            cache.Expire_Time =
              utilities.nowInSeconds() + cachedRequestsExpirationTime;
            console.log(
              BgWhite + FgBlue,
              `[${cache.url} data retrieved from cache]`
            );
            return cache;
          }
        }
      }
    } catch (error) {
      console.log(BgWhite + FgRed, "[repository cache error!]", error);
    }
    return null;
  }
  static flushExpired() {
    let now = utilities.nowInSeconds();
    for (let cache of cachedRequests) {
      if (cache.Expire_Time <= now) {
        console.log(
          BgWhite + FgBlue,
          "Cached file data of " + cache.url + ".json expired"
        );
      }
    }
    cachedRequests = cachedRequests.filter((cache) => cache.Expire_Time > now);
  }
  static get(HttpContext) {
    let cache = CachedRequestsManager.find(HttpContext.req.url);
    if (cache != null && cache.content != undefined) {
      HttpContext.response.JSON(cache.content, cache.ETag, true);
      return true;
    }
    return false;
  }
}
