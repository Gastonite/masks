'use strict';
const Joi = require.main.require('joi');
const Hoek = require('hoek');
const ObjectUtils = require('noos-utils/lib/object');

const internals = {
  isEmpty: require('lodash.isempty'),
  isPlainObject: require('lodash.isplainobject'),
  mapValues: require('lodash.mapvalues'),
  keyBy: require('lodash.keyby')
};

internals.parse = (...args) => {

  let before;
  let mask = args[0];

  if (args.length > 1) {
    before = args[0];
    mask = args[1];
  }

  if (!mask) {
    return false;
  }

  if (!internals.isPlainObject(mask)) {
    return true;
  }

  // if (internals.isEmpty(mask)) {
  //   return false;
  // }

  if (mask.isJoi) {

    if (mask._type !== 'object') {
      return true;
    }

    if (!mask._inner.children || !mask._inner.children.length) {
      return true;
    }

    mask = exports.extractSchemaKeys(mask);
  }

  if (!internals.isPlainObject(before)) {
    return mask;
  }

  Hoek.assert(!before.isJoi, 'before is joi');
  Hoek.assert(!mask.isJoi, 'mask is joi');

  mask = internals.mapValues(mask, (childMask, childKey) => {

    return internals.parse(before[childKey] || {}, childMask);
  });

  return Hoek.applyToDefaults(before, mask);
};

exports.extractSchemaKeys = (schema) => {

  Joi.assert(schema, Joi.object().schema().label('schema').required())
  return internals.mapValues(internals.keyBy(schema._inner.children, 'key'), child => child.schema)
};

internals.sanitizeChild = function () {

  const args = Array.prototype.slice.call(arguments, 0);
  args.shift();

  return exports.sanitize.apply(null, args);
};

internals.sanitizeObject = (object, mask, options) => {

  if (object instanceof Array) {
    object.forEach(item => internals.sanitizeObject(item, mask, options));
    return object;
  }

  const { sanitizeChildFunc, clone, deleteEmptyObjects } = Joi.attempt(options, Joi.object({
    sanitizeChildFunc: Joi.func().default(internals.sanitizeChild),
    clone: Joi.boolean().default(false),
    deleteEmptyObjects: Joi.boolean().default(true)
  }).default().label('options'));

  Joi.assert(object, Joi.object().required().label('object'));

  if (clone) {
    object = Hoek.clone(object);
  }

  if (!Object.keys(object).length) {
    return object;
  }

  if (mask === true) {
    return object;
  }

  const keys = Object.keys(object);

  if (!mask || (internals.isPlainObject(mask) && !Object.keys(mask).length)) {

    keys.forEach(key => {
      delete object[key];
    });

    return object;
  }

  Joi.assert(mask, Joi.object().required().label('mask'));

  keys.forEach(key => {

    const val = object[key];

    //  Delete falsy values
    if (val === void 0 || !mask[key]) {
      delete object[key];
      return;
    }

    //  Let all non object values
    if (!internals.isPlainObject(val)) {
      return;
    }

    let childMask = mask[key];

    const sanitizeChild = child => {

      if (!internals.isPlainObject(val)) {
        return child;
      }

      if (childMask && !internals.isPlainObject(childMask)) {
        return child;
      }

      return sanitizeChildFunc(key, child, childMask);
    };

    object[key] = sanitizeChild(val);

    if (deleteEmptyObjects && internals.isPlainObject(object[key]) && !Object.keys(object[key]).length) {
      delete object[key];
    }

  });


  return object;
};

exports.merge = (masks) => {
  Joi.assert(masks, Joi.array().label('masks').required());

  return masks.reduce(internals.parse, {});
};

exports.keys = (mask) => {

  Joi.assert(mask, Joi.object().label('mask').required());

  mask = internals.parse(mask);

  const keys = ObjectUtils.keys(mask).filter(key => Hoek.reach(mask, key));

  Joi.assert(keys, Joi.array().items(Joi.string()).unique().required());

  return keys;
};

exports.sanitize = (input, masks, options) => {

  Joi.assert(input, Joi.alternatives(
    Joi.object(),
    Joi.array().items(Joi.object())
  ).required().label('input'), new Error('Invalid input'));


  if (!(masks instanceof Array)) {
    masks = [masks];
  }

  // if (internals.isEmpty(masks)) {
  //   return {};
  // }

  // const _sanitize = (input, mask) => {
  //
  //   if (!isArray) {
  //     return internals.sanitizeObject(input, mask, options);
  //   }
  //
  //   input.forEach(item => internals.sanitizeObject(item, mask, options));
  //   return input;
  // };

  // if (union) {
  //
  //   return internals.sanitizeObject(input, exports.merge(masks), options);
  // }

  return masks.reduce((prev, mask) => {

    mask = internals.parse(mask);

    return internals.sanitizeObject(prev, mask, options);

  }, input);
};

