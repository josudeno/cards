package main.java;

import main.java.Card.Card;
import main.java.Card.Deck;

public class Main
{

    public static void main (String [] args)
    {
        Deck deckOfCards = new Deck();
        Thread a = new Player(deckOfCards, "leo");
        Thread b = new Player(deckOfCards, "pipo");
        Thread c = new Player(deckOfCards, "josue");
        Thread d = new Player(deckOfCards, "juan");

        for (int i=1;i<5;i++) {
            for (int x = 1; x < 13; x++) {
                Card aux = null;
                if (i == 1)
                    aux = new Card(x, "Oro");
                if (i == 2)
                    aux = new Card(x, "Basto");
                if (i == 3)
                    aux = new Card(x, "Espada");
                if (i == 4)
                    aux = new Card(x, "Copa");

                deckOfCards.addCard(aux);
            }
        }
        deckOfCards.shuffle();
        //    m.Show();
        a.start ();
        b.start ();
        c.start ();
        d.start ();
    }
}
