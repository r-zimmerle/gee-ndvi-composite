/***************************************************
 * gee_ndvi_composite.js  ·  v1.0 (2025‑06‑03)
 * -------------------------------------------------
 * Creates a cloud‑free, per‑pixel **median NDVI**
 * mosaic for a user‑defined ROI & date range.
 * -------------------------------------------------
 *  – Scene‑level filter:  CLOUDY_PIXEL_PERCENTAGE < 10 %
 *  – Pixel‑level mask  :  SCL classes 4‑7  AND  s2cloudless < 40 %
 *  – Composite         :  per‑pixel median NDVI
 *
 *  Palette – nine‑step perceptually‑uniform ramp
 *      -0.2  →  bare soil / water   →  #8c510a
 *       0.0  →  sparse veg          →  #d9ef8b
 *       0.3  →  moderate veg        →  #91cf60
 *       0.6  →  dense canopy        →  #006837
 *
 *  CRS notes
 *  ------------------------------------------------
 *  If you don’t specify a CRS, GEE will export in
 *  the native projection of the first image (EPSG:4326
 *  for Sentinel‑2 SR).  Alternatively, this script
 *  derives the correct UTM zone for the ROI centroid
 *  and exports in that metre‑based CRS (EPSG 326xx / 327xx).
 *
 *  ⚠️  Change the `useDynamicUTM` flag as desired.
 ***************************************************/

/************* CONFIG (edit here) *******************/
var roi            = /* your geometry */ geometry;
var start          = '2024-01-01';
var end            = '2024-12-31';
var maxCloudPerc   = 10;   // % cloud at scene level
var probThreshold  = 40;   // % s2cloudless probability
var useDynamicUTM  = true; // false → export in EPSG:4326

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
  var maskSCL = scl.eq(4) // vegetation
                 .or(scl.eq(5)) // not‑vegetation (forest)
                 .or(scl.eq(6)) // bare soil
                 .or(scl.eq(7)); // water

  var prob = ee.Image(img.get('cloud_img')).select('probability');
  var maskProb = prob.lt(probThreshold);

  return img.updateMask(maskSCL).updateMask(maskProb);
};

var addNDVI = function (img) {
  return img.addBands(
    img.normalizedDifference(['B8', 'B4']).rename('NDVI')
  );
};

var ndviCol = joined
                .map(s2mask)
                .map(addNDVI)
                .select('NDVI');

print('Valid scenes: ', ndviCol.size());

var ndviMed = ndviCol.median().clip(roi);

/************* VISUALISATION ************************/
Map.centerObject(roi, 11);
Map.addLayer(
  ndviMed,
  { min: -0.2, max: 0.8, palette: ndviPalette },
  'NDVI ' + start + ' to ' + end + ' (median)'
);

/************* EXPORT *******************************/
// ----- choose CRS -----
var exportCRS;
if (useDynamicUTM) {
  var lon = ee.Number(roi.centroid().coordinates().get(0));
  var lat = ee.Number(roi.centroid().coordinates().get(1));
  var utmZone = lon.add(180).divide(6).floor().add(1);
  var epsg = lat.lt(0) ? ee.Number(327).multiply(100).add(utmZone)  // southern hemi
                       : ee.Number(326).multiply(100).add(utmZone); // northern hemi
  exportCRS = 'EPSG:' + epsg.format();
  print('Export CRS (dynamic UTM):', exportCRS);
} else {
  exportCRS = 'EPSG:4326'; // lat/long ‑ global
  print('Export CRS: EPSG:4326 (lat/lon)');
}

Export.image.toDrive({
  image: ndviMed,
  description: 'NDVI_median_' + start.substring(0, 4),
  fileNamePrefix: 'NDVI_median_' + start + '_' + end,
  region: roi,
  scale: 10,
  crs: exportCRS,
  maxPixels: 1e13
});
