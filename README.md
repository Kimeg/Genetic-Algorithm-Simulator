# Genetic-Algorithm-Simulator

-This project has been developed to visualize genetic algorithm being applied to textual data.

-Regarding the data processing, an initial population of chromosomes is generated, where each chromosome consists of a unique combination of alphanumeric + special characters.
-Here, each character in a chromosome is regarded as a gene.

-For each iterative generation, a fraction of fittest offsprings from the previous generation is selected to be passed onto the next generation.
-The algorithm uses target chromosome to measure the fitness score of each chromosome, where the fitness score is proportional to the degree of similarity between target and the corresponding chromosome.
-Feel free to play with the parameters used in the intermediate steps ( selection, crossover, mutation ) to observe diversity within the simulation.
