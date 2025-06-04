/***************************************************
 * gee_ndvi_composite.js  ·  v1.0.1 (2025-06-04)
 * -------------------------------------------------
 * Creates a cloud‑free, per‑pixel **median NDVI**
 * mosaic for a user‑defined ROI & date range.
 * -------------------------------------------------
 *  – Scene-level filter :  CLOUDY_PIXEL_PERCENTAGE < 10 %
 *  – Pixel-level mask   :  SCL classes 4-7  AND  s2cloudless < 40 %
 *  – Composite          :  per-pixel median NDVI
 *
 *  Palette – nine-step perceptually‑uniform ramp
 *      -0.2  →  bare soil / water   →  #8c510a
 *       0.0  →  sparse veg          →  #d9ef8b
 *       0.3  →  moderate veg        →  #91cf60
 *       0.6  →  dense canopy        →  #006837
 *
 *  CRS notes
 *  ------------------------------------------------
 *  · DEFAULT export CRS  = EPSG:4326 (WGS‑84 lat/lon, universal).
 *  · For local analyses in metres, set `userCRS` below to your UTM zone.
 *  · Set `userCRS = null` to let the script auto‑suggest a UTM code
 *    based on the ROI centroid (printed in the console).
 *  · If auto‑detect still fails, the export remains in EPSG:4326.
 ***************************************************/

/************* CONFIG (edit here) *******************/
var roi            = /* your geometry */ geometry;
var start          = '2024-01-01';
var end            = '2024-12-31';
var maxCloudPerc   = 10;  // scene‑level cloud %
var probThreshold  = 40;  // s2cloudless pixel prob %

// 9‑step NDVI palette (hex) — soil → canopy
var ndviPalette = [
  '#d73027', // -0.2
  '#f46d43', // -0.1
  '#fdae61', //  0.0
  '#fee08b', //  0.05
  '#d9ef8b', //  0.15
  '#a6d96a', //  0.25
  '#6ebe55', //  0.35
  '#4daf4a', //  0.45
  '#1a9850', //  0.55
  '#006837', //  0.70
  '#004529'  //  0.85
];

/* CRS override
 * -------------------------------------------------
 * Put your EPSG here if you KNOW it,
 * e.g.  'EPSG:32633'  for UTM 33 N.
 * Leave as null to let the script suggest a UTM code.
 */
var userCRS = null;   // ← default is null (keeps EPSG:4326) – set to your EPSG if needed

/************* COLLECTIONS **************************/
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(roi)
            .filterDate(start, end)
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', maxCloudPerc));

var clouds = ee.ImageCollection('COPERNICUS/S2_CLOUD_PROBABILITY')
                .filterBounds(roi)
                .filterDate(start, end);

/************* JOIN SR ↔ PROBABILITY ****************/
var joined = ee.ImageCollection(
  ee.Join.saveFirst('cloud_img').apply({
    primary:   s2,
    secondary: clouds,
    condition: ee.Filter.equals({
      leftField:  'system:index',
      rightField: 'system:index'
    })
  })
);

/************* MASK & NDVI **************************/
var s2mask = function (img) {
  var scl = img.select('SCL');
  var goodSCL = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7));
  var prob = ee.Image(img.get('cloud_img')).select('probability');
  return img.updateMask(goodSCL).updateMask(prob.lt(probThreshold));
};

var addNDVI = function (img) {
  return img.addBands(
    img.normalizedDifference(['B8','B4']).rename('NDVI')
  );
};

var ndviCol = joined.map(s2mask).map(addNDVI).select('NDVI');
print('Valid scenes:', ndviCol.size());

var ndviMed = ndviCol.median().clip(roi);

/************* VISUALISATION ************************/
Map.centerObject(roi, 11);
Map.addLayer(
  ndviMed,
  {min:-0.2, max:0.8, palette:ndviPalette},
  'NDVI '+start+' to '+end+' (median)'
);

/************* CRS SUGGESTION & EXPORT **************/
var exportCRS = 'EPSG:4326'; // default fallback & web‑friendly

var lon  = ee.Number(roi.centroid().coordinates().get(0));
var lat  = ee.Number(roi.centroid().coordinates().get(1));
var zone = lon.add(180).divide(6).floor().add(1);
var epsgAuto = lat.lt(0)
      ? ee.Number(327).multiply(100).add(zone)   // UTM south
      : ee.Number(326).multiply(100).add(zone);  // UTM north

epsgAuto.evaluate(function(autoNum){
  var autoCRS = autoNum ? 'EPSG:'+autoNum : null;

  if (userCRS && userCRS.length > 5) {
    exportCRS = userCRS;
    print('⚙️  Using USER‑defined CRS → '+exportCRS);
  } else if (autoCRS) {
    exportCRS = autoCRS;
    print('💡 Suggested CRS: '+autoCRS+
          '  (copy into `userCRS` for future runs)');
  } else {
    exportCRS = 'EPSG:4326';
    print('⚠️  CRS could not be determined — staying in EPSG:4326 (lat/lon)');
  }

  Export.image.toDrive({
    image: ndviMed,
    description: 'NDVI_median_'+start.substring(0,4),
    fileNamePrefix: 'NDVI_median_'+start+'_'+end,
    region: roi,
    scale: 10,
    crs: exportCRS,
    maxPixels: 1e13
  });
});
