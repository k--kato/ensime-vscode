declare module "server-api" {
  
  export interface Typehinted {
    typehint: string;
  }
  
  export interface Param {
    localName: string;
  }
  export interface ImplicitParamInfo extends Typehinted {
    typehint: string;
    fun: Param; // Not really
    params: [Param];
  }
  
  export interface ImplicitConversionInfo extends Typehinted {
    fun: Param;
  }

  export interface Type {
    name: string;
    fullName: string;
    declAs: any;
  }
  
}