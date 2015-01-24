var Potion = require('potion');

var app;
var Bounding = require('./bounding');

app = Potion.init(document.querySelector('.game'), {
  configure() {
    this.setSize(400, 400);
  },

  init() {
    this.debug.addConfig({ name: 'Render AABB', entry: 'renderAABB', default: false });
    this.debug.addConfig({ name: 'Render Original Object', entry: 'renderOriginalObject', default: false });
    this.debug.addConfig({ name: 'Render Resolved Collision', entry: 'renderResolvedCollision', default: false });


    this.objects = [];
    var a = new Bounding(10, 10, 40, 70);
    this.objects.push(a);
    a = new Bounding(20, 90, 40, 70);
    this.objects.push(a);
    this.objects.push(new Bounding(40, 300, 320, 60));

    a = new Bounding(100, 40, 100, 50, Math.PI/4);
    this.objects.push(a);

    window.addEventListener('mousewheel', e => this.wheel(e.deltaY));
  },

  wheel(value) {
    if (this.holdObject) {
      if (app.input.isKeyDown('s')) {
        if (app.input.isKeyDown('a')) {
          this.holdObject.height += 10 * Math.sign(value);
        } else {
          this.holdObject.width += 10 * Math.sign(value);
        }
      } else {
        this.holdObject.rotation += value/2000;
      }
    }
  },

  mousedown() {
    if (app.input.isKeyDown('shift')) {
      var obj = new Bounding(app.input.mouse.x, app.input.mouse.y, Math.random() * 30 + 40, Math.random() * 30 + 40, Math.random() * Math.PI*2);
      this.objects.push(obj);
      return;
    }

    for (var i=0, len=this.objects.length; i<len; i++) {
      var object = this.objects[i];
      if (object.collideWithPoint(app.input.mouse.x, app.input.mouse.y)) {
        this.offsetHoldX = app.input.mouse.x - object.x;
        this.offsetHoldY = app.input.mouse.y - object.y;
        object.dynamic = true;
        this.holdObject = object;
        break;
      }
    }
  },

  mouseup() {
    if (this.holdObject) {
      this.holdObject.dx = 0;
      this.holdObject.dy = 0;
      this.holdObject.dynamic = false;
      this.holdObject = null;
    }
  },

  update(time) {
    if (this.holdObject) {
      var x = app.input.mouse.x;
      var y = app.input.mouse.y;

      var dy = y - this.holdObject.y - this.offsetHoldY;
      var dx = x - this.holdObject.x - this.offsetHoldX;

      this.holdObject.dx += dx * time * 30;
      this.holdObject.dy += dy * time * 30;
    }

    for (var i=0, len=this.objects.length; i<len; i++) {
      var object = this.objects[i];
      object.update(time);

      if (object.collideWithPoint(app.input.mouse.x, app.input.mouse.y)) {
        object.hover = true;
      }
    }

    for (i=0; i<this.objects.length; i++) {
      var first = this.objects[i];
      for (var l=i+1; l<this.objects.length; l++) {
        var second = this.objects[l];

        if (first.collideWith(second)) {
          second.isColliding = true;
          first.isColliding = true;

          var overlap;
          if (first.overlap != null) {
            overlap = first.overlap;
            first.resolve(first.axisX, first.axisY, -overlap);

            second.resolve(first.axisX, first.axisY, overlap);
          }
        }
      }
    }
  },

  render() {
    for (var i=0, len=this.objects.length; i<len; i++) {
      this.objects[i].render(app);
    }
  }
});
