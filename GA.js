let pop = [];
let fitness = {};
let new_dict = {};

// population size
let N = 300;

// template variable to store all (probably not) alphanumeric values
let TEMPLATE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 1234567890~!@#$%^&*-=+.,></?_|:;";

// target chromosome
let TARGET = "All work and no play makes jack a dull boy."


function GeneratePop(){
  let s = "";
  for (let i=0; i<N; i++){
    for (let j=0; j<TARGET.length; j++){
      s += TEMPLATE[Math.floor(Math.random() * TEMPLATE.length)];
    }
    pop[i] = s;    
    s = "";
  }
}

function CalcFitness(){
  let score = 0;
  let keys;
  let new_pop = [];
  for (let i=0; i<N; i++){
    for (let j=0; j<TARGET.length; j++){
      if (TARGET[j] == pop[i][j]){
        score++;
      }
    }
    if (!fitness.hasOwnProperty(score)){
      fitness[score] = [];
    }
    fitness[score].push(pop[i]);
    
    score = 0;
  }
  keys = Object.keys(fitness).sort(sorter).reverse();
  let count = 0;
  for (let i=0; i<keys.length; i++){
    for (let j=0; j<fitness[keys[i]].length; j++){
      new_pop[count] = fitness[keys[i]][j];
      count++;
    }
  }
  pop = new_pop;
}

// The choice of ratio values used in the crossover process is entirely up to the user. Feel free to play with them and see how the algorithm behaves.
function Crossover(){
  let child = '';
  let children = [];
  let parent1, parent2;
  let prob;
  
  for (let i=0;i<parseInt(N*5/100);i++){
    children[i] = pop[i];
  }
  
  for (let i=0;i<parseInt(N*95/100);i++){
    parent1 = pop[Math.floor(Math.random() * parseInt(N*10/100))];
    parent2 = pop[Math.floor(Math.random() * parseInt(N*10/100))]; 
    
    child = '';
    
    for (let j=0; j<parent1.length; j++){
      prob = random();
      
      if (prob < 0.45){
        child += parent1[j];
      }else if(prob < 0.9){
        child += parent2[j];
      }else{
        child += TEMPLATE[Math.floor(Math.random() * TEMPLATE.length)];
      }
    }
    children.push(child);
  }
  return children;
}

function display_text(){
  for (let i=0;i<30;i++){
    
    fill(255);
    textSize(10);
    text(new_dict[pop[i]]+ "   " +pop[i], 10, (i+5)*10);
    textSize(25);
    text(nGeneration+" Generation(s)", width/2 - 50, height/8);
    textSize(15);
    text("Target : "+TARGET+" ("+TARGET.length+")", width/2 - 50, height/4);
  }
}

function Swap_dict(){
  let keys = Object.keys(fitness).sort(sorter).reverse();
  for (let i=0; i<keys.length; i++){
    for (let j=0; j< fitness[keys[i]].length;j++){
      new_dict[fitness[keys[i]][j]] = keys[i];
    }
  }
}  

function sorter(a, b){
  return a - b;
}