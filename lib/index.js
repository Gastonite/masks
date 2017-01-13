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

  if (!mask) {
    return false;
  }

  if (typeof mask != 'object') {
    return true;
  }

  if (_.isEmpty(mask)) {
    return false;
  }

  if (mask.isJoi) {

    if (mask._type !== 'object') {
      return true;
    }

    if (!mask._inner.children || !mask._inner.children.length) {
      return true;
    }

    mask = internals.extractSchemas(mask);
  }

  if (!before || typeof before != 'object') {
    return mask;
  }

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

internals.sanitizeObject = (object, mask, options) => {

  const {sanitizeChildFunc} = Joi.attempt(options, Joi.object({
    sanitizeChildFunc: Joi.func().default(internals.sanitizeChild),
  }).unknown().label('options'));

  if (mask === true) {
    return object;
  }

  if (!mask || typeof mask != 'object' || _.isEmpty(mask)) {
    return {};
  }

  Joi.assert(object, Joi.object().required().label('obj'));


  if (_.isEmpty(object)) {
    return object;
  }

  const sanitized = Hoek.clone(object);

  for (let key in sanitized) {

    if (!sanitized.hasOwnProperty(key)) {
      continue;
    }

    const val = sanitized[key];

    //  Delete falsy values
    if (val === void 0 || !mask[key]) {
      delete sanitized[key];
      continue;
    }

    //  Let all non object values
    if (typeof val != 'object') {
      continue;
    }

    let childMask = mask[key];

    const sanitizeChild = child => {

      if (typeof val != 'object') {
        return child;
      }

      if (childMask && typeof childMask != 'object') {
        return child;
      }

      return sanitizeChildFunc(key, child, childMask);
    };

    sanitized[key] = sanitizeChild(val);
  }

  return sanitized;
};

internals.Masks = module.exports = {};

internals.Masks.sanitize = function(input, masks, options) {

  Joi.assert(input, Joi.alternatives(
    Joi.object(),
    Joi.array().min(1)
  ).required().label('input'), new Error('Invalid input'));

  const {union} = options = Joi.attempt(options, Joi.object({
    union: Joi.boolean().default(false)
  }).default().unknown().label('options'));

  const isArray = Array.isArray(input);

  if (!(masks instanceof Array)) {
    masks = [masks];
  }

  if (_.isEmpty(masks)) {
    return {};
  }

  const _sanitize = (input, mask) => {

    if (!isArray) {
      return internals.sanitizeObject(input, mask, options);
    }

    input.forEach(item => internals.sanitizeObject(item, mask, options));
    return input;
  };

  if (union) {

    return _sanitize(input, masks.reduce(internals.parseMask, {}));
  }

  return masks.reduce((prev, mask) => {

    return _sanitize(prev, internals.parseMask(null, mask));

  }, input);
};

