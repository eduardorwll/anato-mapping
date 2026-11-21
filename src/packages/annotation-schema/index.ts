export {
  SCHEMA_VERSION,
  type AnatomicalTaxonomy,
  type AnnotationDocumentV1,
  type CreatePinInput,
  type ParseDocumentResult,
  type Pin,
  type SpecimenImageInfo,
} from "./lib/types";
export {
  createEmptyDocument,
  createEmptyTaxonomy,
  createPin,
  parseAndNormalizeDocument,
  serializeDocument,
} from "./lib/codec";
