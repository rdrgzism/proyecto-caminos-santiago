import './style.css';
import {Map, View} from 'ol';
import OSM from 'ol/source/OSM'; // Fuente de capa OSM
import {Group as LayerGroup, Tile as TileLayer, Vector as VectorLayer} from 'ol/layer'; // Capas de tipo Tile y grupos de capas. Capas vectoriales.
import {fromLonLat} from 'ol/proj'; // Función para transformar coordenadas
import {defaults as defaultControls, FullScreen, OverviewMap, ScaleLine} from 'ol/control'; // Controles de OpenLayers
// Importar componentes necesarios para cargar y mostrar la capa vectorial
import {Vector as VectorSource} from 'ol/source'; // Fuente vectorial
import GeoJSON from 'ol/format/GeoJSON'; // Formato GeoJSON para cargar los datos
// Importar componentes para cargar WMS
import TileWMS from 'ol/source/TileWMS'; // Fuente WMS para capa WMS
// Importar LayerSwitcher
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import LayerSwitcher from 'ol-layerswitcher';

// Importar Overlay para el popup
import Overlay from 'ol/Overlay';
import {Stroke, Style} from "ol/style";

/// ------------------- WebMap ------------------------------

// Configuración del centro y límites del mapa
const spainCenter = fromLonLat([-3.1205, 40.2265]); // Centro de España (Madrid)
const corunaCenter = fromLonLat([-8.4188, 43.3623]); // Centro de A Coruña
const spainExtent = [-4242152.2315, 2253314.7512, 3506727.948, 6152214.69]; // Extensión de España
const defaultZoom = 6.4;

// Boton para centrar el mapa en A Coruña
const buttonCoruna = document.getElementById('button-acoruna');
// Estado para alternar entre posiciones
let isCenteredInCoruna = false;

if (buttonCoruna) {
  buttonCoruna.onclick = () => {
    if (isCenteredInCoruna) {
      // Volver a la posición original
      map.getView().setCenter(spainCenter);
      map.getView().setZoom(defaultZoom);
      buttonCoruna.innerHTML = 'Centar A Coruña';
    } else {
      // Centrar en A Coruña
      map.getView().setCenter(corunaCenter);
      map.getView().setZoom(12);
      buttonCoruna.innerHTML = 'Centrar el mapa';
    }
    // Alternar estado
    isCenteredInCoruna = !isCenteredInCoruna;
  };
} else {
  console.error('Button with ID button-acoruna not found');
}

// Creamos el contenedor y el overlay del popup
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const overlay = new Overlay({
  element: container,
  autoPan: true,
  autoPanAnimation: {duration: 250},
});
closer.onclick = () => {
  overlay.setPosition(undefined);
  closer.blur();
  return false;
};

// Cargamos datos geoJSON y configuramos estilos de caminos
const caminosGeoJSON = 'data/caminos_santiago.geojson';
const caminosSource = new VectorSource({
  url: caminosGeoJSON,
  format: new GeoJSON(),
});

// Diccionario que almacena los colores que usamos para los diferentes caminos
const colorDictionary = {};

// Generamos colores aleatorios.
const generateColorForGroups = (group) => {
  if(!colorDictionary[group]) {
    colorDictionary[group] = '#' + Math.floor(Math.random() * 16777215).toString(16);
  }
  return colorDictionary[group];
};

// Aplicamos el estilo a cada uno de los grupos de caminos.
const styleFunction = (feature) => {
  const agrupacion = feature.get('agrupacion');
  const color = generateColorForGroups(agrupacion);
  return new Style({
    stroke: new Stroke({
      color: color,
      width: 3,
    }),
  });
};

//------------- Cargamos las capas que vamos a usar -----------
// Cargamos la capa de caminos.
const caminosLayer = new VectorLayer({
  source: caminosSource,
  style: styleFunction,
  title: 'Caminos de Santiago',
});

// Capas base.
const osmLayer = new TileLayer({
  source: new OSM({
    attributions: [
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ],
    maxZoom: 19, // Máximo nivel de zoom para OSM
    url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png', // URL del servidor de tiles
    crossOrigin: 'anonymous', // Habilita CORS para asegurar que los tiles se carguen correctamente
  }),
  title: 'OpenStreetMap',
  type: 'base',
  visible: true, // La capa será visible por defecto
  zIndex: 0, // Orden de renderizado
});

const pnoaLayer = new TileLayer({
  title: 'PNOA',
  source: new TileWMS({
    url: 'https://www.ign.es/wms-inspire/pnoa-ma?',
    params: {
      LAYERS: 'OI.OrthoimageCoverage',
      VERSION: '1.3.0',
      TILED: true,
    },
    attributions: [
      '© <a href="https://www.ign.es/">Instituto Geográfico Nacional de España (IGN)</a>'
    ],
    crossOrigin: 'anonymous', // Habilita CORS
  }),
  visible: true, // Visible por defecto
  type: 'base', // Marcada como capa base
  zIndex: 0, // Asegura que está por debajo de otras capas
});

const mtn50Layer = new TileLayer({
  title: 'MTN50',
  source: new TileWMS({
    url: 'https://www.ign.es/wms/primera-edicion-mtn',
    params: {
      LAYERS: 'MTN50',
      VERSION: '1.3.0',
      TILED: true,
    },
    attributions: [
      '© <a href="https://www.ign.es/">Instituto Geográfico Nacional de España (IGN)</a>'
    ],
    crossOrigin: 'anonymous', // Habilita CORS
  }),
  visible: true, // Visible por defecto
  type: 'base', // Marcada como capa base
  zIndex: 0, // Asegura que está por debajo de otras capas
});

// Agrupacion de capas.
const baseLayers = new LayerGroup({
  title: 'Capas base',
  layers: [mtn50Layer,pnoaLayer,osmLayer],
});

const overlayLayers = new LayerGroup({
  title: 'Caminos de Santiago',
  layers: [caminosLayer],
});

// Creamos el mapa
const map = new Map({
  target: 'map',
  layers: [baseLayers,overlayLayers],
  controls: defaultControls().extend([new FullScreen()]),
  view: new View({
    center: spainCenter,
    zoom: defaultZoom,
    maxZoom: 30,
    minZoom: 5,
    extent: spainExtent,
  }),
  overlays: [overlay], // Añadimos el overlay del popup.
});

// Control de capas
const layerSwitcher = new LayerSwitcher({
  activationMode: 'click',
  startActive: false,
  tipLabel: 'Leyenda',
  groupSelectStyle: 'group',
});

map.addControl(layerSwitcher);

// Creamos el control del mapa guía (OverViewMap).
const overviewMapControl = new OverviewMap({
  layers: [
      new TileLayer({
        source: new OSM(),
      }),
  ],
  collapsed: false,
});
overviewMapControl.setTarget(document.getElementById('overviewmap-container'));
map.addControl(overviewMapControl);

// Barra de escala.
const scaleLine = new ScaleLine();
scaleLine.setTarget(document.getElementById('scale-line-container'));
map.addControl(scaleLine);

// Evento para mostar los popups.
map.on('singleclick', function (event) {
  const feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
    return feature;
  });
  if (feature) {
    const properties = feature.getProperties();
    const nombre = properties.nombre || 'Sin nombre';
    const agrupacion = properties.agrupacion || 'Desconocida';

    content.innerHTML = `
        <div>
          <p><b>Nombre:</b> ${nombre}</p>
          <p><b>Agrupación:</b> ${agrupacion}</p>
        </div>
    `;
    overlay.setPosition(event.coordinate);
  } else {
    overlay.setPosition(undefined);
    closer.blur();
  }
});