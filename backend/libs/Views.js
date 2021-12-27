const fs = require('fs');
const path = require('path');
const dvalue = require('dvalue');
const Utils = require(path.resolve(__dirname, 'Utils.js'));

class Views {
  static async getTemplate({ view }) {
    const filePath = path.resolve(__dirname, '../templates', `${view}.tmpl`);
    const buffer = await Utils.readFile({ filePath });
    return buffer.toString();
  }

  static async render({ view, data }) {
    const tmpl = await this.getTemplate({ view });
    const result = dvalue.sprintf(tmpl, ...data);
    return result;
  }

  static async index(options) {
    const view = 'index';
    const data = [];
    const result = await this.render({ view, data });
    return result;
  }

  static async manifest(options) {
    const view = 'manifest';
    const data = [1,2,3,4];
    const result = await this.render({ view, data });
    return result;
  }
}

module.exports = Views;