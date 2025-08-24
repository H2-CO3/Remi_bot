# Contexte et Objectif  

- un ami a moi achete et revend des cartes pokemon de seconde main. Je l'aide a se mettre en place un systeme d'alerte de bonne affaire via discord et un serveur. 
- Un scrapper qui va taper plusieurs site pour aller vérifier si les produits que je recherche sont disponibles et qui doit envoyer une alerte sur discord avec les liens pour acheter si il trouve. 

# site a scrapper : Vinted / ebay / leboncoin / cardmarket 


## Voici les urls qu'on a comme exemple pour toi : 

lien vinted : https://www.vinted.fr/

lien recherche carte 1 : https://www.vinted.fr/catalog?search_text=Reshiram+de+N+167%2F159

lien vinted carte 2 : https://www.vinted.fr/catalog?page=1&time=1755629032&search_text=magneton%20svp%20159

lien vinted carte trouvée : https://www.vinted.fr/items/6610271225-magneton-promo?referrer=catalog


lien lbc : https://www.leboncoin.fr/

lien lbc recherche carte 2 : https://www.leboncoin.fr/recherche?text=magneton+svp+159&kst=k&pi=e54969f9-42d8-4354-bdbc-90a32e7c15fe

lien lbc carte trouvée : https://www.leboncoin.fr/ad/collection/2877233988


lien ebay : https://www.ebay.fr/

lien ebay recherche carte 2 : https://www.ebay.fr/sch/i.html?_nkw=magneton+svp+159&_sacat=0&_from=R40&_trksid=p4432023.m570.l1313

lien ebay carte trouvée : https://www.ebay.fr/itm/296851406458?_skw=magneton+svp+159&itmmeta=01K31V8R6R85339TBK7K4Y1KD2&hash=item451db8fe7a:g:eRoAAOSw-NRnTHpq&itmprp=enc%3AAQAKAAAA8FkggFvd1GGDu0w3yXCmi1fC2lKCUpJIxd6WWszWiseqjj9oCwtEuJ1lklemRwO6ApRgtMNg2RIBIZpmMj1%2FW%2B80b7QGtbojbgIixfIxpo0Bxc%2BEr7i5YNMK3L7VHUL6kNCWYUVPcof7YgoOVcXUY6%2Bd5QH5kxQXjzLWPo3LBqw4w60sCkFaWHBtA%2B1SGWgRoAF7bih6dd3TdApJPnDK2n7uctSpWjJ05rgfCH8vDPovjXKunFBtU%2FSV9o0qMasceMtBzsVO3fg8vy47n1tWmqRRJo7ZVzM3UuDx2usxom42dyS2Q6EEh8RDrIP%2FH%2Fx0MA%3D%3D%7Ctkp%3ABk9SR-aEo7uYZg


lien cardmarket : https://www.cardmarket.com/fr/Pokemon

lien cardmarket recherche carte 2 : https://www.cardmarket.com/fr/Pokemon/Products/Singles/SV-Black-Star-Promos/Magneton-V1-SVP159?language=2


Tu peux voir que les parametres qui nous intéresse sont dans les urls de recherche, il faudra les variabiliser.

## Voici les trois références et les prix pour les tests :

- Tortank ex 200/165     Prix maximum : 75 euros 
- Dracaufeu ex 199/165     Prix maximum : 250 euros
- Florizarre ex 198/165      Prix maximum : 75 euros

# Conseil de prototypage 

Pour le test maintenant je vais te demander de nous faire des commandes séparés et de bien séparé les scrapper de chaque sites dans des fichiers séparé distincts qui doivent pouvoir être appelé par un controleur central. 

# Technique 

On va faire ça en nodejs, pour les tests je voudrais qu'à minima on est les liens qui nous intéresse dans un fichier de log à la con. Si tu peux voir pour connecter avec le discord c'est top, dis moi si c'est faisable. 

Segmente le scrapper pour qu'on est un service de scrapping qui sera toujours appelé mais qui géreras les différents appels et les différentes retour en fonction des différents sites, en somme une forme d'achitecture en micro-service rudimentaire. 

## Protections 
Mettre en place un léger délai et la rotation user-agent 