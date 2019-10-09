const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const PUBLIC_DIR = "../public/";

const { encode, toString } = require("../src/shared/js/parse-binary");

const hyperparametersData = require("../src/visualizations/hyperparameters_visualization/js/preprocessed.json");
const toyComparisonData = require("../src/visualizations/toy_comparison_visualization/js/preprocessed.json");

const {
  N_BITS_HYPERPARAMETERS,
  N_BITS_TOY_COMPARISON
} = require("../src/shared/js/parameters");

function _normalize(numbers, nBits) {
  let min = 0;
  let max = 0;
  for (let i = 0; i < numbers.length; i++) {
    const number = numbers[i];
    min = number < min ? number : min;
    max = number > max ? number : max;
  }
  const scale = 2 ** nBits - 1;
  const range = max - min;
  const normalized = numbers.map(number => {
    return Math.floor(((number - min) / range) * scale);
  });
  return { normalized, range: { min, max } };
}

function normalize(points, nBits) {
  const nDimensions = points[0].length;
  const unzipped = [];
  const ranges = [];

  for (let i = 0; i < nDimensions; i++) {
    const dimSlice = points.map(point => point[i]);
    const { normalized, range } = _normalize(dimSlice, nBits);
    unzipped.push(normalized);
    ranges.push(range);
  }
  const zipped = [];
  for (let i = 0; i < points.length; i++) {
    const point = [];
    for (let j = 0; j < nDimensions; j++) {
      point.push(unzipped[j][i]);
    }
    zipped.push(point);
  }
  return { normalized: zipped, ranges };
}

// Process and encode the Hyperparameter Visualization Projections
const encodedHyperparameters = hyperparametersData.map(() => ({}));
hyperparametersData.forEach((entry, index) => {
  Object.keys(entry).forEach(key => {
    const projection = entry[key];

    const { normalized, ranges } = normalize(
      projection,
      N_BITS_HYPERPARAMETERS
    );
    const flattened = _.flatten(normalized);
    const encoded = encode(flattened, N_BITS_HYPERPARAMETERS);
    const data = toString(encoded);

    encodedHyperparameters[index][key] = {
      data,
      nDimensions: 2,
      length: projection.length,
      ranges
    };
  });
});

// Process and encode the Toy Comparison Visualization Projections
const encodedToyComparison = toyComparisonData.map(() => ({
  umap: {},
  tsne: {}
}));
toyComparisonData.forEach((entry, index) => {
  Object.keys(entry).forEach(umapOrTsne => {
    const dict = entry[umapOrTsne];
    Object.keys(dict).forEach(key => {
      const projection = dict[key];

      const { normalized, ranges } = normalize(
        projection,
        N_BITS_TOY_COMPARISON
      );
      const flattened = _.flatten(normalized);
      const encoded = encode(flattened, N_BITS_TOY_COMPARISON);
      const data = toString(encoded);

      encodedToyComparison[index][umapOrTsne][key] = {
        data,
        nDimensions: 2,
        length: projection.length,
        ranges
      };
    });
  });
});

fs.writeFileSync(
  path.join(__dirname, PUBLIC_DIR, "hyperparameters_encoded.json"),
  JSON.stringify(encodedHyperparameters)
);
fs.writeFileSync(
  path.join(__dirname, PUBLIC_DIR, "toy_comparison_encoded.json"),
  JSON.stringify(encodedToyComparison)
);