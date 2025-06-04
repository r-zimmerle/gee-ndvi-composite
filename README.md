# Sentinel‑2 NDVI **Median** Composite (GEE)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.15588637.svg)](https://doi.org/10.5281/zenodo.15588637)

*Clean, reproducible NDVI mosaics in **one click**—with peer‑reviewed cloud masking and per‑pixel median compositing baked‑in.*

---

## What this repo gives you

|✔|Benefit|How it’s guaranteed|
|---|---|---|
|⚡ **Ready‑to‑run**|Copy the script into the [GEE Code Editor](https://code.earthengine.google.com) and hit **Run**.|Self‑contained JS file `code/gee_ndvi_annual_median.js`.|
|🛰 **Cloud‑robust NDVI**|Removes thick/thin cloud _and_ shadows before index calc.|Scene filter (<25% cloud); pixel mask combines SCL (classes 4‑7) & `s2cloudless` (<40%) [Zupanc, 2017]. This GEE-native approach offers good accuracy and accessibility, with `s2cloudless` being benchmarked in studies like Wright _et al._ (2024).|
|📊 **Per‑pixel median**|Dampens sensor noise & residual haze.|Median reducer over time stack (common good‑practice).|
|🎨 **Consistent palette**|Nine‑step, perceptually‑uniform ramp (brown → red → greens).|Matched to common NDVI legends; colour list hard‑coded in the script.|
|🔁 **Reproducible workflow**|DOI‑frozen release on Zenodo; cite & rerun next season.|Versioned GitHub → Zenodo archiving.|
|📚 **Fully referenced**|Built from primary literature & ESA docs.|See _References_ below and detailed [`Methodology.md`](docs/Methodology.md).|

> **Ideal for**: vegetation monitoring, baseline layers for ML, classroom demos—anyone who wants a trustworthy NDVI without delving into cloud‑mask minutiae.

<p align="center">
  <img src="docs/media/nvdi-model.png" width="75%" alt="Annual median NDVI (2024) example">
  <br>
  <em>Figure 1 – Annual median NDVI (2024) for a sample region of interest (ROI), generated using the default script settings.</em>
</p>

---

## Quick start

|  Step |  Action                                                |
| ----- | ------------------------------------------------------ |
|  1    | Open the GEE Code Editor                               |
|  2    | Copy–paste **`code/gee_ndvi_annual_median.js`**        |
|  3    | Edit ROI `geometry`, `start`, `end` → **Run** & Export |

The script previews the mosaic on the map **and** exports a GeoTIFF (10 m, native CRS of the tile).

---

### Advanced settings (optional)

The script exports **by default in EPSG 4326 (WGS-84 lat/lon)**, which is
universally accepted and perfect for quick-look maps and web overlays.
If you need **metric-accurate area or distance calculations**, open
`code/gee_ndvi_annual_median.js` and either:

1. set **`userCRS = 'EPSG:xxxxx'`** to your known UTM zone, or  
2. leave **`userCRS = null`** and run once — the console will print
   *“Suggested CRS: EPSG:326/327xx”* for your ROI; copy that code back
   into `userCRS` before exporting.

---

## Workflow at a glance

This script generates cloud-free Sentinel-2 NDVI median composites by:

1. **Scene filtering:** Pre-selects Sentinel-2 Level-2A images with less than 25% cloud cover (`CLOUDY_PIXEL_PERCENTAGE < 25%`) for the specified period and ROI.
    
2. **Pixel masking:** For each selected image, it applies a robust pixel-level mask by:
    
    - Retaining pixels classified as vegetation, bare soil, water, or unclassified by the Scene Classification Layer (SCL classes 4–7).
        
    - Further refining this by keeping only those pixels where the `s2cloudless` cloud probability [Zupanc, 2017] is below 40%. This combined approach aims to effectively remove clouds and their shadows.
        
3. **NDVI calculation:** Computes the NDVI for each valid pixel in every masked image using the standard formula: `(B8 - B4) / (B8 + B4)` [Rouse _et al._, 1974].
    
4. **Temporal aggregation:** Creates a single composite image by calculating the per-pixel median NDVI from the stack of all processed images. This method is robust to outliers and residual atmospheric effects.
    

For a detailed scientific rationale behind these steps, including data sources, specific parameter justifications, and advanced customisation notes (e.g., monthly mosaics, threshold tuning), please refer to [`docs/Methodology.md`](docs/Methodology.md).


---

## Repository layout

```text
├── code/
│   └── gee_ndvi_annual_median.js   # plug-and-play Earth Engine script
├── docs/
│   ├── LICENSE-docs.md             # CC BY 4.0 – docs & figures
│   ├── Methodology.md              # detailed tech note + refs
│   └── media/
│       └── nvdi-model.png          # example image
├── CITATION.cff                    # citation metadata (CFF)
├── LICENSE                         # MIT – applies to code
└── README.md                       # you are here
```

---

## How to Cite

If this software assists your research, please cite it using the following DOI. This DOI represents all versions and will always resolve to the latest one:

> Zimmerle, R. (2025). Sentinel-2 NDVI median composite with cloud masking. Zenodo. https://doi.org/10.5281/zenodo.15588637


Citations are important as they help justify the continued development and maintenance of this project.

**For reproducibility, or if your work depends on a specific version, please also cite the DOI of that particular version.** You can find the DOIs for all specific versions (e.g., v1.0.1, v1.0.0) on the Zenodo record page associated with this project. For example:

* Version v1.0.1: `https://doi.org/10.5281/zenodo.15589146`

---

## References

* European Space Agency. (2015). *Sentinel‑2 user handbook* (Issue 1, Rev. 2). ESA. Accessed June 3, 2025, from [https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook](https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook)
* Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary‑scale geospatial analysis for everyone. *Remote Sensing of Environment, 202*, 18‑27. Accessed June 3, 2025, from [https://doi.org/10.1016/j.rse.2017.06.031](https://doi.org/10.1016/j.rse.2017.06.031)
* Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. In *Proceedings of the 3rd ERTS‑1 Symposium* (pp. 309‑317). NASA. Accessed June 3, 2025, from [https://ntrs.nasa.gov/citations/19740022614](https://ntrs.nasa.gov/citations/19740022614)
* Wright, N., Duncan, J. M. A., Callow, J. N., Thompson, S. E., & George, R. J. (2024). CloudS2Mask: A novel deep-learning approach for improved cloud and cloud‑shadow masking in Sentinel‑2 imagery. *Remote Sensing of Environment, 306*, 114122. Accessed June 3, 2025, from [https://doi.org/10.1016/j.rse.2024.114122](https://doi.org/10.1016/j.rse.2024.114122)
* Zupanc, A. (2017, December 19). Improving Cloud Detection with Machine Learning. _Sentinel Hub Blog_. Accessed June 4, 2025, from [https://medium.com/sentinel-hub/improving-cloud-detection-with-machinelearning-c09dc5d7cf13](https://medium.com/sentinel-hub/improving-cloud-detection-with-machinelearning-c09dc5d7cf13)

---

## License

- **Source code**: [MIT License](LICENSE)
- **Documentation & media**: [CC BY 4.0](docs/LICENSE-docs.md)