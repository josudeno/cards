package Card;

/**
 * Class Card
 */
public class Card
{
    
    private int number;
    private String suit;

    /**
     * Creates a new instance of card.
     *
     * @param number
     * @param suit
     */
    public Card(int number, String suit)
    {
        this.number = number;
        this.suit = suit;
    }


    public int getNumber()
    {
    return number;
    }


    /**
     * Get suit.
     *
     * @return
     */
    public String getSuit()
    {
        return suit;
    }
}
