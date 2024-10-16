import React from "react";
// PatternFly
import { Button } from "@patternfly/react-core";
// Modals
import InformationModalLayout from "../layouts/InformationModalLayout";
// Components
import TextLayout from "../layouts/TextLayout";
// Hooks
import useAlerts from "src/hooks/useAlerts";
// Data types
import { CertificateData } from "../Form/IpaCertificates";
// Utils
import { parseDn } from "src/utils/utils";
// RPC
import {
  ErrorResult,
  useRemoveHoldCertificateMutation,
} from "src/services/rpc";

interface PropsToRemoveHoldCertificate {
  certificate: CertificateData;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const RemoveHoldCertificate = (props: PropsToRemoveHoldCertificate) => {
  // Alerts to show in the UI
  const alerts = useAlerts();

  // Prepare "cert_remove_hold" API call
  const [certRemoveHold] = useRemoveHoldCertificateMutation();

  const onRemoveHold = () => {
    // Prepare payload
    const serialNumber = props.certificate.certInfo.serial_number;
    const cacn = props.certificate.certInfo.cacn;
    const payload = [serialNumber, cacn];

    // Perform the API call
    certRemoveHold(payload).then((response) => {
      if ("data" in response) {
        if (response.data.result) {
          // Close modal
          props.onClose();
          // Set alert: success
          alerts.addAlert(
            "remove-hold-certificate-success",
            "Certificate hold removed",
            "success"
          );
        } else if (response.data.error) {
          // Set alert: error
          const errorMessage = response.data.error as ErrorResult;
          alerts.addAlert(
            "remove-hold-certificate-error",
            errorMessage.message,
            "danger"
          );
        }
        // Refresh data to show new changes in the UI
        props.onRefresh();
      }
    });
  };

  const infoModalActions = [
    <Button key="remove-hold" variant="danger" onClick={onRemoveHold}>
      Remove hold
    </Button>,
    <Button key="close" variant="link" onClick={props.onClose}>
      Close
    </Button>,
  ];

  const contentMessage = (
    <TextLayout>Do you want to remove the certificate hold?</TextLayout>
  );

  return (
    <>
      <alerts.ManagedAlerts />
      <InformationModalLayout
        title={
          "Certificate for " + parseDn(props.certificate.certInfo.issuer).cn
        }
        variant="medium"
        actions={infoModalActions}
        isOpen={props.isOpen}
        onClose={props.onClose}
        content={contentMessage}
      />
    </>
  );
};

export default RemoveHoldCertificate;
