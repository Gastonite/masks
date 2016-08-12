'use strict';

const Hoek = require('hoek');
const Lab = require('lab');
const {describe, it, before, beforeEach} = exports.lab = Lab.script();
const {expect} = require('code');
const Joi = require('joi')

const Masks = require('../lib')

const input = {
  a: 1,
  b: 2
};

const internals = {};

internals.shouldReturn = (input, mask, result, mergeMasks) => {
  expect(Masks.sanitize(input, mask, {mergeMasks: mergeMasks})).to.equal(result);
};

internals.shouldBeEmpty = (input, param, mergeMasks) =>
  internals.shouldReturn(input, param, {}, mergeMasks);

internals.shouldBeInput = (input, param, mergeMasks) =>
  internals.shouldReturn(Hoek.clone(input), param, input, mergeMasks);

internals.shouldThrow = (input, mask, errorMessage, mergeMasks) => {
  try {
    expect(Masks.sanitize(input, mask, mergeMasks)).to.not.exist();
  } catch (err) {
    expect(err).to.exist();
    expect(err.message).to.equal(errorMessage);
  }
}



describe('Masks.sanitize without mergeMasks options', () => {

  before((done) => {

    done();
  });

  beforeEach((done) => {

    done();
  });

  it('requires at least one input object', (done) => {

    const mask = Joi.object({
      a: Joi.string(),
      b: Joi.date()
    });


    const checkInputParam = value => {
      internals.shouldThrow(value, mask, 'Invalid input');
      internals.shouldThrow(value, mask, 'Invalid input', true);
    };

    checkInputParam(true);
    checkInputParam(false);
    checkInputParam(0);
    checkInputParam(1);
    checkInputParam(null);
    checkInputParam(void 0);
    checkInputParam([]);
    checkInputParam([void 0]);

    done();
  });

  it('returns an empty object(s) no matches are found in mask(s)', (done) => {
    const mask = Joi.object({
      a: Joi.string(),
      b: Joi.date()
    });
    const masks = [
      mask,
      {x: true}
    ];

    const shouldReturn = (input, masks, result) => {
      internals.shouldReturn({}, mask, {});
      internals.shouldReturn({}, mask, {}, true);
    }

    shouldReturn({}, mask, {});
    shouldReturn({z: 1}, mask, {});
    shouldReturn([{}], mask, [{}]);

    shouldReturn({}, masks, {});
    shouldReturn({z: 1}, masks, {});
    shouldReturn([{}], masks, [{}]);

    done();
  });

  it('returns an empty object if masks is a falsy value', (done) => {

    const checkFalsyMasks = param => {
      internals.shouldBeEmpty(input, param);
      internals.shouldBeEmpty(input, param, true)
    };

    checkFalsyMasks(null);
    checkFalsyMasks(0);
    checkFalsyMasks(void 0);
    checkFalsyMasks(false);
    checkFalsyMasks([]);
    checkFalsyMasks([void 0, false]);

    done();
  });

  it('returns an empty object if masks is a falsy value', (done) => {

    const input = {
      a: 1,
      b: 2
    };

    const shouldEqualsInput = param => {
      internals.shouldBeInput(input, param);
      internals.shouldBeInput(input, param, true);
    };

    const shouldBeEmpty = value => {
      internals.shouldBeEmpty(input, value);
      internals.shouldBeEmpty(input, value, true);
    };

    shouldBeEmpty(null);
    shouldBeEmpty(0);
    shouldBeEmpty(void 0);
    shouldBeEmpty(false);
    shouldBeEmpty({});
    shouldBeEmpty({g: 42});
    shouldBeEmpty([]);
    shouldBeEmpty([null]);
    shouldBeEmpty([void 0]);
    shouldBeEmpty([0]);
    shouldBeEmpty([false]);
    shouldBeEmpty([null]);
    shouldBeEmpty([void 0]);
    shouldBeEmpty([0]);
    shouldBeEmpty([false]);

    shouldEqualsInput(1);
    shouldEqualsInput('dsf');
    shouldEqualsInput(true);
    let mask = new Date();
    shouldBeEmpty(mask);
    mask.a = 'sfgdfbm,gdbl,'
    mask.b = 42
    shouldEqualsInput(mask);

    done();
  });

  it('sanitizes an object', (done) => {




    const input = {
      a: 1,
      b: [2],
      bs: 2,
      z: 3,
      c: {
        ca: 1,
        oca: 10,
        cz: 2
      }
    };

    const masks = [
      {
        a: true,
        b: true,
        c: {
          ca: true,
          cb: {
            cba: true,
            cbb: true
          }
        }
      }
    ];


    internals.shouldReturn(Hoek.clone(input), masks, {
      a: 1,
      b: [2],
      c: {
        ca: 1
      }
    });

    masks.push({});

    internals.shouldBeEmpty(input, masks);
    internals.shouldBeEmpty(input, masks, true);

    masks.push(Joi.object());

    internals.shouldBeEmpty(input, masks);
    internals.shouldBeInput(input, masks, true);

    masks.push(Joi.object({
      b: Joi.string()
    }));

    internals.shouldBeEmpty(input, masks);
    internals.shouldReturn(Hoek.clone(input), masks, {b: [2]}, true);

    done();
  });

  it('sanitizes an object (with one Joi mask)', (done) => {

    const input = {
      a: 1,
      b: 2,
      bs: 2,
      z: 3,
      c: {
        ca: 1,
        oca: 10,
        cz: 2
      }
    };

    const mask = Joi.object({
      a: Joi.string(),
      b: Joi.date(),
      c: Joi.object({
        ca: Joi.string(),
        cb: Joi.object({
          cba: Joi.string(),
          cbb: Joi.date()
        })
      })
    });

    internals.shouldReturn(input, mask, {
      a: 1,
      b: 2,
      c: {
        ca: 1
      }
    });

    done();
  });

  it('sanitizes multiple objects (with one Joi mask)', (done) => {

    const input = [
      {
        a: 1,
        b: 2,
        bs: 2,
        z: 3,
        c: {
          ca: 1,
          oca: 10,
          cz: 2
        }
      },
      {
        a: 8,
        bo: 2,
        z: {
          u: 74
        },
        c: {
          ca: 100,
          oca: 10,
          cz: 42
        }
      }
    ];

    const mask = Joi.object({
      a: Joi.string(),
      b: Joi.date(),
      c: Joi.object({
        ca: Joi.string(),
        cb: Joi.object({
          cba: Joi.string(),
          cbb: Joi.date()
        })
      })
    });

    const result = [
      {
        a: 1,
        b: 2,
        c: {
          ca: 1
        }
      },
      {
        a: 8,
        c: {
          ca: 100
        }
      }
    ];

    internals.shouldReturn(input, mask, result);

    done();
  });

  it('considers any Joi schema as truthy value, even if it is an empty Joi.object()', (done) => {

    const input = {
      a: 1,
      b: {
        ba: 1
      },
      bs: 2,
      z: 3,
      c: {
        ca: 1,
        oca: 10,
        cb: {
          cba: {
            cbaa: 42,
            cbaz: 1,
            cbay: 2,
            cbax: 3
          }
        }
      }
    };


    const mask = Joi.object({
      a: Joi.string(),
      b: Joi.date(),
      c: Joi.object({
        ca: Joi.string(),
        cb: Joi.object({
          cba: Joi.object(),
          cbb: Joi.date()
        })
      })
    });

    internals.shouldReturn(input, mask, {
      a: 1,
      b: {
        ba: 1
      },
      c: {
        ca: 1,
        cb: {
          cba: {
            cbaa: 42,
            cbaz: 1,
            cbay: 2,
            cbax: 3
          }
        }
      }
    });

    done();
  });

  it('produces a sum mask', (done) => {

    const input = {
      a : 'olkjhb',
      b : 'flihugycfxd',
      c : {
        ca : [
          {
            caa : 'sddemna',
            cab : 'dfhuok'
          }
        ]
      },
      d : {
        da : {
          daa : 'sfdgsfdgd',
          dab : 'dffhklipmil'
        },
        db : {
          dba : true,
          dbb : 'rytyie',
          dbc : 'khhkhjkdrtetuiyitgr',
          dbd : 'sdfghkhjgkhjkj',
          dbe : {
            dbea : [
              {
                dbeaa : 'pwet',
                dbeab : 'ilktyr',
                dbeac : false
              }
            ]
          }
        }
      }
    };

    const masks = [
      Joi.object({
        a: Joi.string(),
        b: Joi.string(),
        c: Joi.object(),
        d: Joi.object().min(1).pattern(/^[a-z0-9]+$/, Joi.object({
          dba: Joi.boolean(),
          dbb: Joi.string(),
          dbc: Joi.string().required(),
          dbd: Joi.string().required()
        })),
        e: Joi.object()
      })
    ];

    masks.push({})

    internals.shouldBeEmpty(input, masks)

    masks.push({
      c: true,
      d: {
        db: {
          dbe: {
            dbea: {
              dbeaa: true
            }
          }
        }
      }
    })

    internals.shouldBeEmpty(input, masks)
    internals.shouldReturn(Hoek.clone(input), masks, {
      c : {
        ca : [
          {
            caa : 'sddemna',
            cab : 'dfhuok'
          }
        ]
      },
      d: {
        db: {
          dbe: {
            dbea: [
              {
                dbeaa: 'pwet'
              }
            ]
          }
        }
      }
    }, true)

    masks.push({
      c: {}
    })

    internals.shouldBeEmpty(input, masks)
    internals.shouldReturn(Hoek.clone(input), masks, {
      d: {
        db: {
          dbe: {
            dbea: [
              {
                dbeaa: 'pwet'
              }
            ]
          }
        }
      }
    }, true);

    masks.push({
      d: Joi.object({
        db: Joi.object()
      })
    })

    internals.shouldBeEmpty(input, masks)
    internals.shouldReturn(Hoek.clone(input), masks, {
      d: {
        db: {
          dba : true,
          dbb : 'rytyie',
          dbc : 'khhkhjkdrtetuiyitgr',
          dbd : 'sdfghkhjgkhjkj',
          dbe : {
            dbea : [
              {
                dbeaa : 'pwet',
                dbeab : 'ilktyr',
                dbeac : false
              }
            ]
          }
        }
      }
    }, true);

    done();
  });

  it('overrides a Joi mask by plain object mask', (done) => {

    const input = {
      a : 'olkjhb',
      b : 'ycfxd',
      z: 9,
      c : {
        ca: 42,
        cb: 'pwet'
      }
    };

    const masks = [
      Joi.object({
        a: Joi.string(),
        b: Joi.string(),
        c: Joi.object({
          ca: Joi.object()
        })
      })
    ];

    internals.shouldReturn(Hoek.clone(input), masks, {
      a : 'olkjhb',
      b : 'ycfxd',
      c : {
        ca: 42
      }
    });

    masks.push({
      a: false,
      c: {
        cb: true
      }
    })

    internals.shouldReturn(Hoek.clone(input), masks, {
      c : {}
    });

    internals.shouldReturn(Hoek.clone(input), masks, {
      b : 'ycfxd',
      c : {
        ca: 42,
        cb: 'pwet'
      }
    }, true);

    masks.push({
      a: false,
      c: {
        ca: false
      }
    })

    internals.shouldReturn(Hoek.clone(input), masks, {
      c : {}
    });

    internals.shouldReturn(Hoek.clone(input), masks, {
      b : 'ycfxd',
      c : {
        cb: 'pwet'
      }
    }, true);

    done();
  });

  it('overrides a plain object mask by a Joi.object() mask', (done) => {

    const input = {
      a : 'olkjhb',
      b : 'ycfxd',
      z: 9,
      c : {
        ca: 42,
        cb: 'pwet'
      }
    };

    const masks = [
      {
        a: true,
        c: true
      },
      Joi.object({
        a: Joi.string(),
        b: Joi.string(),
        c: Joi.object({
          ca: Joi.object()
        })
      })
    ];

    internals.shouldReturn(Hoek.clone(input), masks, {
      a : 'olkjhb',
      c : {
        ca: 42
      }
    });

    internals.shouldReturn(Hoek.clone(input), masks, {
      a : 'olkjhb',
      b : 'ycfxd',
      c : {
        ca: 42
      }
    }, true);

    done();
  });

  it('overrides a Joi mask with an empty object', (done) => {

    const input = {
      a : 'olkjhb',
      b : 'ycfxd',
      z: 9,
      c : {
        ca: 42,
        cb: 'pwet'
      }
    };

    const masks = [
      Joi.object({
        a: Joi.string(),
        b: Joi.string(),
        c: Joi.object({
          ca: Joi.object()
        })
      }),
      {}
    ];

    internals.shouldBeEmpty(input, masks);
    internals.shouldBeEmpty(input, masks, true);

    done();
  });

  it('overrides a Joi mask with an object mask', (done) => {

    const input = {
      a : 1,
      b : 2,
      c : {
        ca: 42,
        cb: 'pwet'
      }
    };

    const masks = [
      Joi.object({
        a: Joi.string(),
        b: Joi.string(),
        c: Joi.object({
          ca: Joi.object()
        })
      }),
      {a: true, c: {cb: true}}
    ];

    internals.shouldReturn(Hoek.clone(input), masks, {a: 1, c: {}});
    internals.shouldBeInput(input, masks, true);

    masks.push({b: false, c: {ca: 0}});

    internals.shouldReturn(Hoek.clone(input), masks, {c: {}});
    internals.shouldReturn(input, masks, {
      a : 1,
      c: {
        cb: 'pwet'
      }
    }, true);

    done();
  });

  // it('tres simple', (done) => {
  //
  //   const input = {
  //     a: 1,
  //     b: 2
  //   };
  //
  //   const masks = [
  //     Joi.object({
  //       a: Joi.any()
  //     })
  //   ];
  //
  //   internals.shouldReturn(Hoek.clone(input), masks, {
  //     a: 1
  //   });
  //
  //   masks.push({b: true});
  //
  //   internals.shouldReturn(Hoek.clone(input), masks, {
  //     a: 1,
  //     b: 2
  //   });
  //
  //   done();
  // });
});
