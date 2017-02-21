package Player;


import Card.Deck;

import java.util.ArrayList;
import java.util.Arrays;

/**
 * Player factory class.
 */
public class Factory
{

    private final Deck deck;

    public Factory(Deck deck) {
        this.deck = deck;
    }

    /**
     * Creates a player.
     *
     * @param name  The player name
     *
     * @return Player
     */
    public Player createPlayer(String name) {
        return new Player(this.deck, name);
    }


    /**
     * Creates a list of players from a list of names.
     *
     * @param names  The list of player names
     *
     * @return ArrayList<Player>
     */
    public ArrayList<Player> createPlayers(String[] names) {
        ArrayList<Player> players = new ArrayList<>();

        Arrays.asList(names).forEach((name) -> players.add(this.createPlayer(name)) );

        return players;
    }
}
