let nGeneration = 1;

let _timer = 0;
let delay = 0;

let WIDTH = 800;
let HEIGHT = 600;

let children = [];

function setup() {
  createCanvas(WIDTH, HEIGHT);

  // Initialize population of size N
  GeneratePop();
}

function draw() {
  //increment timer value
  _timer++;
  
  // skip rendering process while the timer value is less than given delay value
  if (_timer < delay){
    return;
  }
  
  _timer = 0;
  background(0);

  // Genetic Algorithm is applied to retrieve next generation
  CalcFitness();
  Swap_dict();
  display_text();
  
  // If the chromosome, with maximal fitness value within current population, matches the intended target, the program exits.
  if (Object.keys(fitness).sort(sorter).reverse()[0]==TARGET.length){
    console.log('Target matched.');
    fill(0,255,0);
    textSize(20);
    text("Target Matched!", width/2 - 50, height*3/8);
    noLoop();
  }
  
  // next generation
  children = Crossover();
  
  // Replace current generation with next generation 
  pop = children;
  
  fitness = {};
  new_dict = {};
  
  //increment generation index
  nGeneration++;
}