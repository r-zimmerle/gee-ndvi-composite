# Methodology · Cloud‑free Sentinel‑2 NDVI Composites

> **Scope.** This note documents the scientific rationale behind the `gee_ndvi_composite.js` script and provides enough detail for peer review and reproducibility.
>
> *Example settings below use the calendar year **2024**, but every parameter is user‑configurable.*

---

## 1 · Data sources

| Component       | Collection / product                                         | Key reference              |
| --------------- | ------------------------------------------------------------ | -------------------------- |
| **Imagery**     | Sentinel‑2 **Level‑2A** surface–reflectance (SR\_HARMONIZED) | European Space Agency 2015 |
| **Cloud prob.** | Sentinel‑2 **s2cloudless** probability images                | Zupanc, 2017               |
| **Platform**    | Google Earth Engine (public data catalogue)                  | Gorelick *et al.* 2017     |

All collections are accessed directly within the Earth Engine cloud—no local downloads required.

---

## 2 · Good‑practice workflow

> This workflow employs a multi-step process to generate cloud-free NDVI composites, combining standard Google Earth Engine (GEE) techniques with user-defined parameters for cloud and shadow masking. The primary cloud masking relies on the Sentinel-2 Scene Classification Layer (SCL) and the `s2cloudless` cloud probability product [Zupanc, 2017], an accessible GEE-native algorithm frequently included in cloud masking benchmarks [e.g., Wright *et al.*, 2024]. The NDVI calculation follows the classical definition [Rouse *et al.*, 1974].

**Rationale for Processing Parameters:**

The specific parameters used in this script are chosen to balance data quality, processing efficiency, and general applicability.

* **Scene-level filter (`CLOUDY_PIXEL_PERCENTAGE < 25%`):**
    * **Purpose:** To pre-filter the Sentinel-2 image collection and exclude scenes that are heavily contaminated by clouds.
    * **Justification:** A threshold of 25% is a common heuristic in remote sensing workflows. It aims to strike a balance between maximizing the number of available scenes for the composite and minimizing the processing of images that are unlikely to yield a significant number of valid (cloud-free) pixels. This reduces computational load and generally improves the quality of the input data for the subsequent pixel-level masking and temporal aggregation.

* **Pixel-level mask (SCL classes 4–7 AND `s2cloudless` probability `< 40%`):**
    * **Purpose:** To identify and mask out residual cloud and cloud shadow pixels at a finer scale, after the initial scene-level filtering.
    * **Justification:** This script uses a two-tiered approach for robust pixel masking:
        1.  **Scene Classification Layer (SCL):** The SCL is a standard component of Sentinel-2 Level-2A products, providing a per-pixel classification (e.g., vegetation, bare soil, water, cloud types). This script retains pixels classified as vegetation (SCL class 4), bare soils (SCL class 5), water (SCL class 6), and unclassified (SCL class 7). The "unclassified" class is included as it may contain valid land/water pixels not perfectly captured by other SCL classes, particularly in mixed or complex areas, while cloud-specific SCL classes are inherently excluded.
        2.  **`s2cloudless` probability:** The `s2cloudless` algorithm [Zupanc, 2017] provides a per-pixel probability of cloud presence (available in GEE as `COPERNICUS/S2_CLOUD_PROBABILITY`). A threshold of `< 40%` is applied, meaning pixels with a `s2cloudless` cloud probability of 40% or higher are considered cloud-contaminated and are masked out. This 40% value represents a practical trade-off: a significantly lower threshold might aggressively remove some clear land pixels (especially bright surfaces), leading to data loss (commission error in the mask). Conversely, a much higher threshold could allow thin clouds, haze, or cloud edges to remain (omission error). The chosen 40% threshold aims for reasonable cloud removal for general-purpose applications without excessive loss of valid data. This parameter is user-configurable in the script, allowing adjustment for specific regional characteristics or application sensitivities.
    * **Combined Approach:** By requiring a pixel to meet *both* the SCL criteria *and* the `s2cloudless` probability threshold, the script aims to create a more reliable cloud mask than relying on either method in isolation. This leverages the deterministic classification of the SCL with the probabilistic assessment of `s2cloudless`.

* **Temporal reduce (Median of NDVI stack):**
    * **Purpose:** To aggregate the time series of cloud-masked NDVI images into a single, representative composite image for the specified period.
    * **Justification:** The median is a robust statistical aggregator. When applied on a per-pixel basis to a stack of NDVI images, it effectively suppresses the influence of outliers. Outliers can arise from various sources, including residual atmospheric effects (e.g., thin haze not perfectly masked), undetected thin clouds, sensor noise, or extreme view/illumination angle effects in individual images. By selecting the median value, the resulting composite is less sensitive to these transient anomalies and provides a more stable and representative depiction of the typical vegetation condition over the analysis period.

The table below summarises the main processing steps:

| Step                   | Purpose                                         | Filter / operation                                                                             |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Scene‑level filter** | Remove acquisitions dominated by cloud          | `CLOUDY_PIXEL_PERCENTAGE < 25` %                                                               |
| **Pixel mask**         | Eliminate residual **cloud & shadow** artefacts | keep Scene Classification Layer (SCL) classes **4–7** *and* `s2cloudless` probability `< 40` % |
| **Per‑image NDVI**     | Translate reflectance → vegetation signal       | `NDVI = (B8 − B4) / (B8 + B4)`                                                                 |
| **Temporal reduce**    | Suppress outliers, view‑angle & haze noise      | **Median** of NDVI stack, pixel‑wise                                                           |

*Outcome → a cloud‑free, per‑pixel **median NDVI mosaic** for the selected period, clipped to your Region of Interest (ROI).* Typical run‑time: < 1 min for regional ROIs.

---

## 3 · NDVI definition

$$
\mathrm{NDVI} = \frac{\rho_{\text{NIR}} - \rho_{\text{Red}}}{\rho_{\text{NIR}} + \rho_{\text{Red}}}
$$

where $\rho$ denotes surface reflectance; Sentinel‑2 bands: **B8 (NIR)**, **B4 (Red)**. — Rouse *et al.* 1974.

---

## 4 · Customising the script

The table below lists the most common tweaks. Open **`code/gee_ndvi_annual_median.js`** and edit the lines indicated.

| What you want                    | Where to change in the script                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Different period**             | Edit the `start` and `end` variables in the CONFIG block                                                                             |
| **Monthly composites**           | Wrap the reducer in a loop (see the GEE [iterate() guide](https://developers.google.com/earth-engine/guides/aggregations#iteration)) |
| **Looser / stricter cloud mask** | Adjust `maxCloudPerc` (scene level) and/or `probThreshold` (pixel level)                                                             |
| **Alternate ROI**                | Draw or import geometry in the GEE Code Editor and assign it to `roi`                                                                |
| **Export CRS / resolution**      | Set `crs` (or `userCRS`) and `scale` in the EXPORT block                                                                             |

---

#### Choosing the correct CRS

| Scenario                                               | What to do                                                                                           | Note                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Quick maps / web overlays**                          | Keep the default **EPSG 4326**                                                                       | Small area / distance distortion (a few %) |
| **Metrics in metres (hectares, buffers, zonal stats)** | Set `userCRS = 'EPSG:UTMxx'` **or** leave `null` and copy the *Suggested CRS* printed in the console | UTM preserves local area/length            |

If the script cannot suggest a UTM (e.g. ROI too small or invalid) it will stay in **4326**. You can always re‑project later in QGIS/ArcGIS if you need precise metrics.

Feel free to fork and adapt—just keep the reference list below so others can track provenance.

---

## 5 · Reproducibility & Peer Review

This workflow has been validated in open, version-controlled repositories and is suitable for peer review. Code and data are versioned for full reproducibility, supporting open science practices.

---

## 6 · References

* European Space Agency. (2015). *Sentinel‑2 user handbook* (Issue 1, Rev. 2). ESA. Accessed June 3, 2025, from [https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook](https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook)
* Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary‑scale geospatial analysis for everyone. *Remote Sensing of Environment, 202*, 18‑27. Accessed June 3, 2025, from [https://doi.org/10.1016/j.rse.2017.06.031](https://doi.org/10.1016/j.rse.2017.06.031)
* Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. In *Proceedings of the 3rd ERTS‑1 Symposium* (pp. 309‑317). NASA. Accessed June 3, 2025, from [https://ntrs.nasa.gov/citations/19740022614](https://ntrs.nasa.gov/citations/19740022614)
* Wright, N., Duncan, J. M. A., Callow, J. N., Thompson, S. E., & George, R. J. (2024). CloudS2Mask: A novel deep-learning approach for improved cloud and cloud‑shadow masking in Sentinel‑2 imagery. *Remote Sensing of Environment, 306*, 114122. Accessed June 3, 2025, from [https://doi.org/10.1016/j.rse.2024.114122](https://doi.org/10.1016/j.rse.2024.114122)
* Zupanc, A. (2017, December 19). Improving Cloud Detection with Machine Learning. _Sentinel Hub Blog_. Accessed June 4, 2025, from [https://medium.com/sentinel-hub/improving-cloud-detection-with-machinelearning-c09dc5d7cf13](https://medium.com/sentinel-hub/improving-cloud-detection-with-machinelearning-c09dc5d7cf13)

---

**Citation of this workflow**
>
> The methodology described in this document is implemented in the `gee_ndvi_composite.js` script, which is archived on Zenodo.
>
> To cite the software/workflow generally, please use the following concept DOI. This DOI represents all versions and will always resolve to the latest one:
>
> ```
> Zimmerle, R. (2025). Sentinel-2 NDVI median composite with cloud masking. Zenodo. [https://doi.org/10.5281/zenodo.15588637](https://doi.org/10.5281/zenodo.15588637)
> ```
>
> For precise reproducibility of the methods as detailed in *this document* (which corresponds to **v1.0.1** of the software/workflow), or if your work specifically builds upon this version, we strongly recommend citing the specific software version:
>
> * **Version v1.0.1:**
>     ```
>     Zimmerle, R. (2025). Sentinel-2 NDVI median composite with cloud masking (v1.0.1). Zenodo. [https://doi.org/10.5281/zenodo.15589146](https://doi.org/10.5281/zenodo.15589146)
>     ```
>
> You can find DOIs for all specific versions on the Zenodo record page associated with this project.

---
