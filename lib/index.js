'use strict';
const Joi = require('joi')
const Hoek = require('hoek')

const internals = {};
const _ = {
  isEmpty: require('lodash.isempty'),
  mapValues: require('lodash.mapvalues'),
  keyBy: require('lodash.keyby')
};


internals.parseMask = (before, mask) => {

  if (!mask)
    return false;

  if (typeof mask != 'object')
    return true;

  if (_.isEmpty(mask))
    return false;

  if (mask.isJoi) {

    if (mask._type !== 'object')
      return true;

    if (!mask._inner.children || !mask._inner.children.length)
      return true;

    mask = internals.extractSchemas(mask);
  }

  if (!before || typeof before != 'object')
    return mask;

  Hoek.assert(!before.isJoi, 'before is joi');
  Hoek.assert(!mask.isJoi, 'mask is joi');

  mask = _.mapValues(mask, (childMask, childKey) => {
    return internals.parseMask(before[childKey] || {}, childMask);
  });

  return Hoek.applyToDefaults(before, mask);
};

internals.extractSchemas = (schema) => {
  return _.mapValues(_.keyBy(schema._inner.children, 'key'), child => child.schema)
};

internals.sanitizeChild = function () {
  const args = Array.prototype.slice.call(arguments, 0);
  args.shift();

  return internals.Masks.sanitize.apply(null, args);
};

internals.Masks = module.exports = {};

internals.Masks.sanitize = function(input, masks, options) {

  Joi.assert(input, Joi.alternatives(
    Joi.object(),
    Joi.array().min(1)
  ).required().label('input'), new Error('Invalid input'));

  options = Joi.attempt(options, Joi.object({
    sanitizeChildFunc: Joi.func().default(internals.sanitizeChild),
    mergeMasks: Joi.boolean().default(false)
  }).default().label('options'));

  const isArray = Array.isArray(input);

  if (!Array.isArray(masks))
    masks = [masks];

  if (_.isEmpty(masks))
    return {};


  const _sanitizeObject = (obj, mask) => {

    if (mask === true)
      return obj;

    // Joi.assert(mask, Joi.object().required().label('mask'));


    if (!mask || typeof mask != 'object' || _.isEmpty(mask))
      return {};

    Joi.assert(obj, Joi.object().required().label('obj'));

    // if (typeof obj != 'object' || _.isEmpty(obj))
    if (_.isEmpty(obj))
      return obj;


    for (let key in obj) {
      if (!obj.hasOwnProperty(key))
        continue;

      const val = obj[key];

      //  Delete falsy values
      if (val === void 0 || !mask[key]) {
        delete obj[key];
        continue;
      }

      //  Let all non object values
      if (typeof val != 'object')
        continue;

      let childMask = mask[key];

      const sanitizeChild = child => {

        if (typeof val != 'object')
          return child;

        if (childMask && typeof childMask != 'object')
          return child;

        return options.sanitizeChildFunc(key, child, childMask)
      };

      obj[key] = sanitizeChild(val);
    }

    return obj;
  };

  if (options.mergeMasks) {

    const mergedMask = masks.reduce((before, mask) => {
      return internals.parseMask(before, mask);
    }, {});

    return isArray
      ? input.map(item => _sanitizeObject(item, mergedMask))
      : _sanitizeObject(input, mergedMask);

  }

  return masks.reduce((prev, mask) => {

    mask = internals.parseMask(null, mask);

    return isArray
      ? prev.map(item => _sanitizeObject(item, mask))
      : _sanitizeObject(prev, mask);

  }, input);

};

