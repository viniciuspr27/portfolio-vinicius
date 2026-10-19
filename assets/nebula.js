(function () {
  'use strict';

  // Edit these values to customize the galaxy. Everything is drawn locally.
  const CONFIG = {
    colors: ['#c9789d', '#9b7acb', '#e5ae86', '#eed4ac', '#6ba6aa'],
    fog: 112,
    dust: 540,
    stars: 110,
    pixelRatio: 1.4
  };

  function randomSource(seed) {
    return () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296; };
  }
  function rgba(hex,alpha) {
    return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${alpha})`;
  }
  window.createNebulaRenderer = function (canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const random = randomSource(2706);
    const sprites = CONFIG.colors.map(color => {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 192;
      const paint = sprite.getContext('2d');
      const grid=Float32Array.from({length:4096},random);
      function noise(x,y) {
        const ix=Math.floor(x),iy=Math.floor(y);
        let u=x-ix,v=y-iy;u=u*u*(3-2*u);v=v*v*(3-2*v);
        const a=grid[(ix&63)+(iy&63)*64],b=grid[((ix+1)&63)+(iy&63)*64];
        const c=grid[(ix&63)+((iy+1)&63)*64],d=grid[((ix+1)&63)+((iy+1)&63)*64];
        return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v;
      }
      function cloudNoise(x,y) {
        let value=0,weight=.56;
        for(let i=0;i<4;i++){value+=noise(x,y)*weight;x=x*2.07+7.1;y=y*2.03-3.7;weight*=.47;}
        return value;
      }
      const pixels=paint.createImageData(192,192);
      const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
      for (let y=0;y<192;y++) for(let x=0;x<192;x++) {
        const u=(x-96)/96,v=(y-96)/96;
        const edge=Math.max(0,1-u*u-v*v);
        const warp=noise(x*.035+14,y*.035+9)*2;
        const density=Math.max(0,cloudNoise(x*.055+warp,y*.055-warp)-.19);
        const alpha=Math.pow(density,1.4)*Math.pow(edge,1.3)*.95;
        const index=(y*192+x)*4;
        pixels.data[index]=rgb[0];pixels.data[index+1]=rgb[1];pixels.data[index+2]=rgb[2];pixels.data[index+3]=Math.round(alpha*255);
      }
      paint.putImageData(pixels,0,0);
      return sprite;
    });
    function cloudPoint(index) {
      const radius = Math.pow(random(),.64);
      return {radius,angle:radius*5.5+(index%3)*Math.PI*2/3+(random()-.5)*.9,z:(random()-.5)*.55,phase:random()*Math.PI*2};
    }
    const fog = Array.from({length:CONFIG.fog},(_,i) => ({...cloudPoint(i),size:.55+random()*.65,opacity:.4+random()*.6,color:i%17===0?4:i%4}));
    const dust = Array.from({length:CONFIG.dust},(_,i) => ({...cloudPoint(i),size:.2+random()*.85,color:i%4}));
    const stars = Array.from({length:CONFIG.stars},() => ({x:(random()-.5)*2.65,y:(random()-.5)*2.2,z:random(),size:.4+random()*.9,phase:random()*7}));
    const sparks = Array.from({length:38},() => ({angle:random()*Math.PI*2,speed:.35+random()*.7,size:.6+random()*1.2}));
    let width=1,height=1,ratio=1;
    let lastPointer={x:0,y:0},lastTime=0;
    const trail=[];
    function resize() {
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      ratio=Math.min(window.devicePixelRatio||1,CONFIG.pixelRatio);
      const w=Math.round(width*ratio),h=Math.round(height*ratio);
      if (canvas.width!==w || canvas.height!==h) { canvas.width=w;canvas.height=h; }
      ctx.setTransform(ratio,0,0,ratio,0,0);
    }
    canvas.parentElement.classList.add('nebula-ready');
    return {draw(state) {
      resize();
      const time=state.time||0,px=state.pointerX||0,py=state.pointerY||0;
      const energy=Math.max(0,Math.min(1.4,state.energy||0));
      const pulse=state.pulse??1,power=state.power||0;
      const radius=Math.min(width*.39,height*.4);
      const cx=width*.5,cy=height*.48;
      const yaw=px*.32,tilt=py*.18,rotation=-.28+(state.rotation||0)*.22;
      const pointer={x:px*radius*1.1,y:py*radius*.95};
      function project(x,y,z) {
        const xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
        const yy=y*Math.cos(tilt)-zz*Math.sin(tilt);
        return {x:(xx*Math.cos(rotation)-yy*Math.sin(rotation))*radius,y:(xx*Math.sin(rotation)+yy*Math.cos(rotation))*radius,z:zz};
      }
      function orbit(p) {
        const angle=p.angle+time*.045+Math.sin(time*.16+p.phase)*.055;
        let x=Math.cos(angle)*p.radius,y=Math.sin(angle)*p.radius*.78;
        const dx=x-px*.85,dy=y-py*.8,field=Math.exp(-(dx*dx+dy*dy)*3.5)*Math.min(energy,.65);
        x+=(-dy*.2+px*.12)*field;y+=(dx*.2+py*.12)*field;
        const expansion=1+Math.sin(pulse*Math.PI)*power*.13;
        return project(x*expansion,y*expansion,p.z+Math.sin(time*.2+p.phase)*.04);
      }
      function glow(x,y,r,color,alpha) {
        const g=ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,rgba(color,alpha));g.addColorStop(.25,rgba(color,alpha*.45));g.addColorStop(1,rgba(color,0));
        ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
      }
      ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(cx,cy);ctx.globalCompositeOperation='screen';
      // Widely spaced stars give the cloud depth without a rectangular backdrop.
      for (const star of stars) {
        const p=project(star.x+px*star.z*.045,star.y+py*star.z*.045,star.z*.2);
        const fade=Math.max(0,1-Math.hypot(star.x/1.5,star.y/1.3));
        const twinkle=.65+Math.sin(time*.7+star.phase)*.2;
        ctx.globalAlpha=fade*twinkle;ctx.fillStyle='#ede2d5';ctx.beginPath();ctx.arc(p.x,p.y,star.size,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      glow(-radius*.08,radius*.05,radius*.82,'#8e5eaf',.12);
      // Layered soft sprites form the wisps; no external bitmap or dependency.
      for (const cloud of fog) {
        const p=orbit(cloud),distance=Math.hypot((p.x-pointer.x)/radius,(p.y-pointer.y)/radius);
        const light=1+Math.exp(-distance*distance*3)*energy*.6;
        const size=cloud.size*radius*(1+Math.sin(time*.24+cloud.phase)*.06);
        ctx.globalAlpha=Math.min(1,cloud.opacity*light*(.68+Math.sin(time*.3+cloud.phase)*.045));
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(cloud.angle-time*.018);
        ctx.scale(1.15,.8+cloud.radius*.2);ctx.drawImage(sprites[cloud.color],-size/2,-size/2,size,size);ctx.restore();
      }
      ctx.globalAlpha=1;
      glow(0,0,radius*.38,'#e5ae86',.22+energy*.09);
      glow(pointer.x*.75,pointer.y*.75,radius*.5,'#eecff2',energy*.2);
      // Dust bends around the pointer, keeping a fine sparkling structure.
      for (const particle of dust) {
        const p=orbit(particle),distance=Math.hypot((p.x-pointer.x)/radius,(p.y-pointer.y)/radius);
        const light=Math.exp(-distance*distance*5)*energy;
        ctx.globalAlpha=Math.min(1,.12+particle.radius*.34+light*.45);
        ctx.fillStyle=CONFIG.colors[particle.color];ctx.beginPath();ctx.arc(p.x,p.y,particle.size*(1+light*.7),0,Math.PI*2);ctx.fill();
      }
      // A short luminous wake reacts to movement instead of following forever.
      if (!state.paused && time!==lastTime && Math.hypot(px-lastPointer.x,py-lastPointer.y)>.012) {
        trail.push({x:pointer.x,y:pointer.y,time});if(trail.length>20)trail.shift();
      }
      for (let i=trail.length-1;i>=0;i--) {
        const age=time-trail[i].time;if(age>.75){trail.splice(i,1);continue;}
        ctx.globalAlpha=(1-age/.75)*Math.min(energy,.7);
        glow(trail[i].x,trail[i].y,12+age*20,'#e8baed',.09);
      }
      ctx.globalAlpha=1;
      if (pulse<1 && !state.paused) {
        const opacity=Math.sin(pulse*Math.PI)*power;
        glow(pointer.x,pointer.y,radius*(.12+pulse*.5),'#ffe1b5',opacity*.22);
        for (const spark of sparks) {
          const distance=pulse*spark.speed*radius*1.12;
          const x=pointer.x+Math.cos(spark.angle)*distance,y=pointer.y+Math.sin(spark.angle)*distance*.8;
          ctx.strokeStyle=rgba(spark.angle>3?'#f5d5a6':'#cba3eb',opacity*.65);ctx.lineWidth=spark.size;
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(spark.angle)*(2+pulse*9),y-Math.sin(spark.angle)*(2+pulse*7));ctx.stroke();
        }
      }
      // Feather the complete cloud into the page, including on narrow screens.
      ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';
      ctx.scale(width*.48,height*.45);
      const edge=ctx.createRadialGradient(0,0,.52,0,0,1);
      edge.addColorStop(0,'rgba(0,0,0,1)');edge.addColorStop(.72,'rgba(0,0,0,.85)');edge.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=edge;ctx.fillRect(-2,-2,4,4);
      ctx.restore();lastPointer={x:px,y:py};lastTime=time;
    }};
  };
})();
