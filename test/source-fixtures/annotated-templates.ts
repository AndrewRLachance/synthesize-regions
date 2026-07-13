const prefix = "not part of the template";

/** @TEMPLATE id=Message output=expression */
`Hello, ${/** @TYPE string id=name **/ "world" /** @END **/}!`
/** @END_TEMPLATE */

void prefix;
