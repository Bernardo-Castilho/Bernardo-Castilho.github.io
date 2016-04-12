// include wijmo css
//  uses style-loader, css-loader
//  https://github.com/webpack/style-loader
//  npm install style-loader css-loader --save
require('style!css!./vendor/wijmo.min.css');

// include wijmo scripts
//  uses script loader
//  https://github.com/webpack/script-loader
//  npm install script-lodader --save
require("script!./vendor/wijmo.min.js");
require("script!./vendor/wijmo.input.min.js");
require("script!./vendor/wijmo.grid.min.js");

// include whatever else you like here
