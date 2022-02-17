import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // Verificando se existe no localstorage o carrinho
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      //Se existir configurar o setCart
      return JSON.parse(storagedCart);
    }
    return [];
  });
  /**
   *
   * Verificando alteração do carrinho
   * e atualizando o localstorage
   *
   *
   */
  const prevCartRef = useRef<Product[]>();
  useEffect(() => {
    prevCartRef.current = cart;
  });
  const cartPreviousValue = prevCartRef.current ?? cart;
  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);
  /**
   *
   * Add Produto (Função)
   *
   *
   */
  const addProduct = async (productId: number) => {
    try {
      //Criando um novo array para manipular o cart
      const updatedCart = [...cart];
      // Verificando se ja existe o produto no carrinho
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      // Consultando a API (estoque)
      const stock = await api.get(`stock/${productId}`);
      // Obtendo a quantidade em estoque
      const stockAmount = stock.data.amount;
      // Verificando a quantidade inserida no carrinho
      const currentAmount = productExists ? productExists.amount : 0;
      // Adicionando mais um item
      const newAmount = currentAmount + 1;
      // Verificar se o solicitado é maior que o estoque
      //Caso a quantidade solicitada seja returnar um erro

      if (newAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      //verificando se o produto existe no carrinho
      if (productExists) {
        // se sim incrementa a quantidade
        productExists.amount = newAmount;
      } else {
        //Se não, obtem o produto da api e add ao carrinho com o valor de 1
        const addProduct = await api.get(`products/${productId}`);
        const newProduct = { ...addProduct.data, amount: 1 };
        updatedCart.push(newProduct);
      }
      //Atualizando o Carrinho
      setCart(updatedCart);
    } catch {
      //Caso dê algum erro exibir uma notificação
      toast.error("Erro na adição do produto");
    }
  };
  /**
   *
   * Remover Produto (Função)
   *
   *
   */
  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };
  /**
   *
   * Atualizar Quantidade (Função)
   *
   *
   */
  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //Se a quantidade recebida for 0 ou menos finaliza direto
      if (amount <= 0) {
        return;
      }
      // Consultando a API (estoque)
      const stock = await api.get(`stock/${productId}`);
      // Obtendo a quantidade em estoque
      const stockAmount = stock.data.amount;
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        return;
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
