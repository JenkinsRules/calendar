public class TestCloudCode {
    public static void main(String[] argv) {
        System.out.println("Guten Tag Welt!");
        for (int i = 0; i <200; i++) udskriv(i);
    }

    static public void udskriv(int cou) {
        System.out.println(cou*(cou==0 ? 0 : cou-1));
    }
}