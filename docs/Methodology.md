# Methodology · Cloud‑free Sentinel‑2 NDVI Composites

> **Scope.** This note documents the scientific rationale behind the `gee_ndvi_composite.js` script and provides enough detail for peer review and reproducibility.
>
> *Example settings below use the calendar year **2024**, but every parameter is user‑configurable.*

---

## 1 · Data sources

| Component       | Collection / product                                         | Key reference              |
| --------------- | ------------------------------------------------------------ | -------------------------- |
| **Imagery**     | Sentinel‑2 **Level‑2A** surface–reflectance (SR\_HARMONIZED) | European Space Agency 2015 |
| **Cloud prob.** | Sentinel‑2 **s2cloudless** probability images                | Wright *et al.* 2024       |
| **Platform**    | Google Earth Engine (public data catalogue)                  | Gorelick *et al.* 2017     |

All collections are accessed directly within the Earth Engine cloud—no local downloads required.

---

## 2 · Good‑practice workflow

> Adapted from CloudS2Mask (Wright *et al.* 2024) and classical NDVI literature.

| Step                   | Purpose                                         | Filter / operation                                                                             |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Scene‑level filter** | Remove acquisitions dominated by cloud          | `CLOUDY_PIXEL_PERCENTAGE < 10` %                                                               |
| **Pixel mask**         | Eliminate residual **cloud & shadow** artefacts | keep Scene Classification Layer (SCL) classes **4–7** *and* `s2cloudless` probability `< 40` % |
| **Per‑image NDVI**     | Translate reflectance → vegetation signal       | `NDVI = (B8 − B4) / (B8 + B4)`                                                                 |
| **Temporal reduce**    | Suppress outliers, view‑angle & haze noise      | **Median** of NDVI stack, pixel‑wise                                                           |

*Outcome → a cloud‑free, per‑pixel **median NDVI mosaic** for the selected period, clipped to your Region of Interest (ROI).* Typical run‑time: < 1 min for regional ROIs.

---

## 3 · NDVI definition

$$
\mathrm{NDVI} = \frac{\rho_{\text{NIR}} - \rho_{\text{Red}}}{\rho_{\text{NIR}} + \rho_{\text{Red}}}
$$

where \$\rho\$ denotes surface reflectance; Sentinel‑2 bands: **B8 (NIR)**, **B4 (Red)**. — Rouse *et al.* 1974.

---

## 4 · Customising the script

The table below lists the most common tweaks. Open **`code/gee_ndvi_annual_median.js`** and edit the lines indicated.

| What you want                    | Where to change in the script                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Different period**             | Edit the `start` and `end` variables in the CONFIG block                                                                             |
| **Monthly composites**           | Wrap the reducer in a loop (see the GEE [iterate() guide](https://developers.google.com/earth-engine/guides/aggregations#iteration)) |
| **Looser / stricter cloud mask** | Adjust `maxCloudPerc` (scene level) and/or `probThreshold` (pixel level)                                                             |
| **Alternate ROI**                | Draw or import geometry in the GEE Code Editor and assign it to `roi`                                                                |
| **Export CRS / resolution**      | Set `crs` (or `userCRS`) and `scale` in the EXPORT block                                                                             |

---

#### Choosing the correct CRS

| Scenario                                               | What to do                                                                                           | Note                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Quick maps / web overlays**                          | Keep the default **EPSG 4326**                                                                       | Small area / distance distortion (a few %) |
| **Metrics in metres (hectares, buffers, zonal stats)** | Set `userCRS = 'EPSG:UTMxx'` **or** leave `null` and copy the *Suggested CRS* printed in the console | UTM preserves local area/length            |

If the script cannot suggest a UTM (e.g. ROI too small or invalid) it will stay in **4326**. You can always re‑project later in QGIS/ArcGIS if you need precise metrics.

Feel free to fork and adapt—just keep the reference list below so others can track provenance.

---

## 5 · Reproducibility & Peer Review

This workflow has been validated in open, version-controlled repositories and is suitable for peer review. Code and data are versioned for full reproducibility, supporting open science practices.

---

## 6 · References

* European Space Agency. (2015). **Sentinel‑2 user handbook** (Issue 1, Rev. 2). ESA Standard Document GMES‑S2OP‑EOPG‑TN‑13‑0061. Retrieved June 3, 2025, from [https://sentinels.copernicus.eu/](https://sentinels.copernicus.eu/)
* Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). *Google Earth Engine: Planetary‑scale geospatial analysis for everyone*. *Remote Sensing of Environment*, 202, 18–27. [https://doi.org/10.1016/j.rse.2017.06.031](https://doi.org/10.1016/j.rse.2017.06.031)
* Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. In *Third Earth Resources Technology Satellite‑1 Symposium* (Vol. 1, pp. 309–317). NASA SP‑351.
* Wright, N., Duncan, J. M. A., Callow, J. N., Thompson, S. E., & George, R. J. (2024). CloudS2Mask: A novel deep learning approach for improved cloud and cloud shadow masking in Sentinel‑2 imagery. *Remote Sensing of Environment*, 306, 114122. [https://doi.org/10.1016/j.rse.2024.114122](https://doi.org/10.1016/j.rse.2024.114122)

*Accessed 3 Jun 2025.*

---

> **Citation of this workflow**
> Zimmerle, R. (2025). Sentinel-2 NDVI median composite with cloud masking (v1.0.1). Zenodo. https://doi.org/10.5281/zenodo.15589146
