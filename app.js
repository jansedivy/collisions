var Potion = require('potion');

var app;

class GameObject {
  constructor(x=0, y=0, width=100, height=100, rotation=0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.dynamic = false;
    this.rotation = rotation;
    this.isColliding = false;

    this.dx = 0;
    this.dy = 0;
    this.hover = false;

    this.minX = 0;
    this.minY = 0;

    this.maxX = 0;
    this.maxY = 0;

    this.UL = { x: 0, y: 0 };
    this.UR = { x: 0, y: 0 };
    this.LL = { x: 0, y: 0 };
    this.LR = { x: 0, y: 0 };

    this.dirtyAABB = true;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }

  get centerX() { return this.x + this.width/2; }
  get centerY() { return this.y + this.height/2; }

  collideWithPoint(x, y) {
    if (this.rotation !== 0) {
      if (!this.isPointInBoundingBox(x, y)) {
        return false;
      }

      var c = Math.cos(this.rotation);
      var s = Math.sin(this.rotation);

      var dx = this.centerX - x;
      var dy = this.centerY - y;

      x = dx * c + dy * s + this.centerX;
      y = -dx * s + dy * c + this.centerY;
    }

    return x >= this.left && y >= this.top && x <= this.right && y <= this.bottom;
  }

  collidesOnAxis(other, axis1x, axis1y) {
    var minA;
    var maxA;

    var value, someValue;

    value = (this.UR.x * axis1x + this.UR.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    minA = someValue;
    maxA = someValue;

    value = (this.UL.x * axis1x + this.UL.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minA) { minA = someValue; }
    if (someValue > maxA) { maxA = someValue; }

    value = (this.LL.x * axis1x + this.LL.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minA) { minA = someValue; }
    if (someValue > maxA) { maxA = someValue; }

    value = (this.LR.x * axis1x + this.LR.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minA) { minA = someValue; }
    if (someValue > maxA) { maxA = someValue; }

    var minB;
    var maxB;

    value = (other.UR.x * axis1x + other.UR.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    minB = someValue;
    maxB = someValue;

    value = (other.UL.x * axis1x + other.UL.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minB) { minB = someValue; }
    if (someValue > maxB) { maxB = someValue; }

    value = (other.LL.x * axis1x + other.LL.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minB) { minB = someValue; }
    if (someValue > maxB) { maxB = someValue; }

    value = (other.LR.x * axis1x + other.LR.y * axis1y)/(axis1x^2 + axis1y^2);
    someValue = value * axis1x * axis1x + value * axis1y * axis1y;
    if (someValue < minB) { minB = someValue; }
    if (someValue > maxB) { maxB = someValue; }

    var result = minB <= maxA && maxB >= minA;

    return result;
  }

  isPointInBoundingBox(x, y) {
    return x >= this.minX && y >= this.minY && x <= this.maxX && y <= this.maxY;
  }

  collidesWithBoundingBox(other) {
    return this.minY < other.maxY && this.minX < other.maxX && this.maxY > other.minY && this.maxX > other.minX;
  }

  collideWith(other) {
    if (this.rotation === 0 && other.rotation === 0) {
      return this.top < other.bottom && this.left < other.right && this.bottom > other.top && this.right > other.left;
    } else {
      if (this.collidesWithBoundingBox(other)) {
        var axis1x = this.UR.x - this.UL.x;
        var axis1y = this.UR.y - this.UL.y;

        var axis2x = this.UR.x - this.LR.x;
        var axis2y = this.UR.y - this.LR.y;

        var axis3x = other.UL.x - other.LL.x;
        var axis3y = other.UL.y - other.LL.y;

        var axis4x = other.UL.x - other.UR.x;
        var axis4y = other.UL.y - other.UR.y;

        return this.collidesOnAxis(other, axis1x, axis1y) &&
          this.collidesOnAxis(other, axis2x, axis2y) &&
          this.collidesOnAxis(other, axis3x, axis3y) &&
          this.collidesOnAxis(other, axis4x, axis4y);
      }
    }

    return false;
  }

  resolveCollision(other) {
    var xOverlay = 0;
    var yOverlay = 0;

    if (this.centerX > other.centerX) {
      xOverlay = other.right - this.left;
    } else {
      xOverlay = other.left - this.right;
    }

    if (this.centerY > other.centerY) {
      yOverlay = other.bottom - this.top;
    } else {
      yOverlay = other.top - this.bottom;
    }

    if (Math.abs(xOverlay) < Math.abs(yOverlay)) {
      this.x += xOverlay;
    } else {
      this.y += yOverlay;
    }
  }

  calculateMinMax() {
    if (!this.dirtyAABB) { return; }
    this.dirtyAABB = false;

    var c = Math.cos(-this.rotation);
    var s = Math.sin(-this.rotation);

    var dx = this.left - this.centerX;
    var dy = this.top - this.centerY;

    var x = dx * c + dy * s + this.centerX;
    this.minX = x;
    this.maxX = x;

    var y = -dx * s + dy * c + this.centerY;
    this.minY = y;
    this.maxY = y;

    this.UL.x = x;
    this.UL.y = y;

    dx = this.right - this.centerX;
    dy = this.top - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.UR.x = x;
    this.UR.y = y;

    dx = this.right - this.centerX;
    dy = this.bottom - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.LR.x = x;
    this.LR.y = y;

    dx = this.left - this.centerX;
    dy = this.bottom - this.centerY;

    x = dx * c + dy * s + this.centerX;
    if (x < this.minX) { this.minX = x; }
    if (x > this.maxX) { this.maxX = x; }

    y = -dx * s + dy * c + this.centerY;
    if (y < this.minY) { this.minY = y; }
    if (y > this.maxY) { this.maxY = y; }

    this.LL.x = x;
    this.LL.y = y;
  }

  update(time) {
    this.isColliding = false;
    this.hover = false;

    if (this.dynamic) {
      this.dirtyAABB = true;
      this.dx = this.dx + (0 - this.dx) * time * 8;
      this.dy = this.dy + (0 - this.dy) * time * 8;

      this.x += this.dx * time;
      this.y += this.dy * time;
    }

    this.calculateMinMax();
  }

  render() {
    if (app.debug.renderAABB) {
      app.video.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      app.video.ctx.fillRect(this.minX, this.minY, this.maxX - this.minX, this.maxY - this.minY);
    }

    if (app.debug.renderOriginalObject) {
      app.video.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      app.video.ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    if (this.isColliding) {
      app.video.ctx.fillStyle = 'rgba(0, 100, 200, 0.6)';
    } else if (this.hover) {
      app.video.ctx.fillStyle = 'rgba(255, 0, 100, 0.9)';
    } else if (this.dynamic) {
      app.video.ctx.fillStyle = 'rgba(0, 200, 100, 0.6)';
    } else {
      app.video.ctx.fillStyle = 'rgba(255, 0, 100, 0.6)';
    }

    app.video.ctx.save();
    app.video.ctx.translate(this.centerX, this.centerY);
    app.video.ctx.rotate(this.rotation);
    app.video.ctx.translate(-this.centerX, -this.centerY);
    app.video.ctx.fillRect(this.x, this.y, this.width, this.height);
    app.video.ctx.restore();

    app.video.ctx.strokeStyle = 'red';
    app.video.ctx.beginPath();
    app.video.ctx.moveTo(this.centerX, this.centerY);
    app.video.ctx.lineTo(this.centerX + this.dx, this.centerY + this.dy);
    app.video.ctx.closePath();
    app.video.ctx.stroke();
  }
}

app = Potion.init(document.querySelector('.game'), {
  configure() {
    this.setSize(400, 400);
  },

  init() {
    this.debug.addConfig({ name: 'Render AABB', entry: 'renderAABB', default: false });
    this.debug.addConfig({ name: 'Render Original Object', entry: 'renderOriginalObject', default: false });

    this.objects = [];
    this.objects.push(new GameObject(10, 10, 40, 70));
    this.objects.push(new GameObject(20, 90, 40, 70));
    // this.objects.push(new GameObject(40, 300, 320, 60));

    this.objects.push(new GameObject(100, 40, 100, 50, Math.PI/4));

    window.addEventListener('mousewheel', e => this.wheel(e.deltaY));
  },

  wheel(value) {
    if (this.holdObject) {
      this.holdObject.rotation += value/2000;
    }
  },

  mousedown() {
    if (app.input.isKeyDown('shift')) {
      var obj = new GameObject(app.input.mouse.x, app.input.mouse.y, Math.random() * 30 + 40, Math.random() * 30 + 40, Math.random() * Math.PI*2);
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

          if (first.rotation !== 0 || second.rotation !== 0) {
            // resolve with rotation
          } else {
            if (first.dynamic) {
              first.resolveCollision(second);
            }

            if (second.dynamic) {
              second.resolveCollision(first);
            }
          }
        }
      }
    }
  },

  render() {
    for (var i=0, len=this.objects.length; i<len; i++) {
      this.objects[i].render();
    }
  }
});
