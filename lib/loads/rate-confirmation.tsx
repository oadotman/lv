import React from 'react'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font } from '@react-pdf/renderer'

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
})

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Roboto',
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 20,
    borderBottom: '2pt solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: 700,
  },
  value: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  gridCol: {
    flex: 1,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: 'white',
    padding: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1pt solid #ddd',
    padding: 5,
  },
  tableCol: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  signature: {
    marginTop: 30,
    borderTop: '1pt solid #000',
    paddingTop: 10,
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: 40,
  },
  signatureBox: {
    flex: 1,
    marginHorizontal: 20,
  },
  signatureLine: {
    borderTop: '1pt solid #000',
    marginTop: 30,
    paddingTop: 5,
    fontSize: 8,
  },
  terms: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    fontSize: 8,
  },
  important: {
    backgroundColor: '#ffeb3b',
    padding: 2,
  },
})

interface LoadData {
  load_number: string
  status: string
  // Shipper info
  shipper_name?: string
  shipper_contact?: string
  shipper_phone?: string
  shipper_email?: string
  // Carrier info
  carrier_name?: string
  mc_number?: string
  dot_number?: string
  carrier_contact?: string
  carrier_phone?: string
  carrier_email?: string
  driver_name?: string
  driver_phone?: string
  // Pickup info
  pickup_date?: string
  pickup_time?: string
  pickup_address?: string
  pickup_city?: string
  pickup_state?: string
  pickup_zip?: string
  pickup_contact?: string
  pickup_phone?: string
  // Delivery info
  delivery_date?: string
  delivery_time?: string
  delivery_address?: string
  delivery_city?: string
  delivery_state?: string
  delivery_zip?: string
  delivery_contact?: string
  delivery_phone?: string
  // Load details
  commodity?: string
  weight?: string
  pallets?: number
  equipment_type?: string
  miles?: number
  rate?: number
  special_instructions?: string
  temperature?: string
  hazmat?: boolean
  team_required?: boolean
  // Broker info
  broker_name?: string
  broker_mc?: string
  broker_contact?: string
  broker_phone?: string
  broker_email?: string
}

interface RateConfirmationProps {
  load: LoadData
  brokerInfo: {
    name: string
    mc_number: string
    address?: string
    phone?: string
    email?: string
  }
}

const RateConfirmationDocument: React.FC<RateConfirmationProps> = ({ load, brokerInfo }) => {
  const confirmationNumber = `RC-${load.load_number || new Date().getTime()}`
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RATE CONFIRMATION</Text>
          <Text style={styles.subtitle}>{confirmationNumber}</Text>
          <Text style={styles.subtitle}>Date: {currentDate}</Text>
        </View>

        {/* Broker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BROKER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{brokerInfo.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MC Number:</Text>
            <Text style={styles.value}>{brokerInfo.mc_number}</Text>
          </View>
          {brokerInfo.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{brokerInfo.address}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{brokerInfo.phone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{brokerInfo.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Carrier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CARRIER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{load.carrier_name || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MC Number:</Text>
            <Text style={styles.value}>{load.mc_number || 'TBD'}</Text>
          </View>
          {load.dot_number && (
            <View style={styles.row}>
              <Text style={styles.label}>DOT Number:</Text>
              <Text style={styles.value}>{load.dot_number}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>{load.carrier_contact || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{load.carrier_phone || 'TBD'}</Text>
          </View>
          {load.driver_name && (
            <View style={styles.row}>
              <Text style={styles.label}>Driver:</Text>
              <Text style={styles.value}>{load.driver_name} - {load.driver_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Load Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOAD DETAILS</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Load #:</Text>
                <Text style={styles.value}>{load.load_number}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Equipment:</Text>
                <Text style={styles.value}>{load.equipment_type || 'TBD'}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Commodity:</Text>
                <Text style={styles.value}>{load.commodity || 'General Freight'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{load.weight || 'TBD'} lbs</Text>
              </View>
            </View>
          </View>
          {load.special_instructions && (
            <View style={styles.row}>
              <Text style={styles.label}>Special Instructions:</Text>
              <Text style={styles.value}>{load.special_instructions}</Text>
            </View>
          )}
        </View>

        {/* Pickup Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PICKUP INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date/Time:</Text>
            <Text style={styles.value}>
              {load.pickup_date || 'TBD'} at {load.pickup_time || 'TBD'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{load.shipper_name || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {load.pickup_address || ''} {load.pickup_city || ''}, {load.pickup_state || ''} {load.pickup_zip || ''}
            </Text>
          </View>
          {load.pickup_contact && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{load.pickup_contact} - {load.pickup_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date/Time:</Text>
            <Text style={styles.value}>
              {load.delivery_date || 'TBD'} at {load.delivery_time || 'TBD'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {load.delivery_address || ''} {load.delivery_city || ''}, {load.delivery_state || ''} {load.delivery_zip || ''}
            </Text>
          </View>
          {load.delivery_contact && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{load.delivery_contact} - {load.delivery_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Rate Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RATE AGREEMENT</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Miles:</Text>
            <Text style={styles.value}>{load.miles || 0} miles</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Line Haul Rate:</Text>
            <Text style={[styles.value, styles.important]}>
              ${load.rate?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {load.miles && load.rate && (
            <View style={styles.row}>
              <Text style={styles.label}>Rate Per Mile:</Text>
              <Text style={styles.value}>
                ${(load.rate / load.miles).toFixed(2)}/mile
              </Text>
            </View>
          )}
        </View>

        {/* Terms & Conditions */}
        <View style={styles.terms}>
          <Text style={{ fontWeight: 700, marginBottom: 5 }}>TERMS & CONDITIONS</Text>
          <Text>1. Carrier agrees to transport the shipment described above.</Text>
          <Text>2. Payment terms: Net 30 days upon receipt of signed BOL and POD.</Text>
          <Text>3. Carrier must maintain cargo and liability insurance.</Text>
          <Text>4. This rate confirmation supersedes all previous quotes.</Text>
          <Text>5. Carrier agrees not to re-broker this load.</Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>Carrier Signature & Date</Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>Broker Signature & Date</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by LoadVoice • {currentDate} • Page 1 of 1
        </Text>
      </Page>
    </Document>
  )
}

export default RateConfirmationDocument

// Export a function that returns the Document element directly for server-side rendering
export const createRateConfirmationDocument = (props: RateConfirmationProps) => {
  const { load, brokerInfo } = props
  const confirmationNumber = `RC-${load.load_number || new Date().getTime()}`
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>RATE CONFIRMATION</Text>
          <Text style={styles.subtitle}>{confirmationNumber}</Text>
          <Text style={styles.subtitle}>Date: {currentDate}</Text>
        </View>

        {/* Broker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BROKER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{brokerInfo.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MC Number:</Text>
            <Text style={styles.value}>{brokerInfo.mc_number}</Text>
          </View>
          {brokerInfo.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{brokerInfo.address}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{brokerInfo.phone || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{brokerInfo.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Carrier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CARRIER INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{load.carrier_name || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>MC Number:</Text>
            <Text style={styles.value}>{load.mc_number || 'TBD'}</Text>
          </View>
          {load.dot_number && (
            <View style={styles.row}>
              <Text style={styles.label}>DOT Number:</Text>
              <Text style={styles.value}>{load.dot_number}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Contact:</Text>
            <Text style={styles.value}>{load.carrier_contact || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{load.carrier_phone || 'TBD'}</Text>
          </View>
          {load.driver_name && (
            <View style={styles.row}>
              <Text style={styles.label}>Driver:</Text>
              <Text style={styles.value}>{load.driver_name} - {load.driver_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Load Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOAD DETAILS</Text>
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Load #:</Text>
                <Text style={styles.value}>{load.load_number}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Equipment:</Text>
                <Text style={styles.value}>{load.equipment_type || 'TBD'}</Text>
              </View>
            </View>
            <View style={styles.gridCol}>
              <View style={styles.row}>
                <Text style={styles.label}>Commodity:</Text>
                <Text style={styles.value}>{load.commodity || 'General Freight'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Weight:</Text>
                <Text style={styles.value}>{load.weight || 'TBD'} lbs</Text>
              </View>
            </View>
          </View>
          {load.special_instructions && (
            <View style={styles.row}>
              <Text style={styles.label}>Special Instructions:</Text>
              <Text style={styles.value}>{load.special_instructions}</Text>
            </View>
          )}
        </View>

        {/* Pickup Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PICKUP INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date/Time:</Text>
            <Text style={styles.value}>
              {load.pickup_date || 'TBD'} at {load.pickup_time || 'TBD'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{load.shipper_name || 'TBD'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {load.pickup_address || ''} {load.pickup_city || ''}, {load.pickup_state || ''} {load.pickup_zip || ''}
            </Text>
          </View>
          {load.pickup_contact && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{load.pickup_contact} - {load.pickup_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date/Time:</Text>
            <Text style={styles.value}>
              {load.delivery_date || 'TBD'} at {load.delivery_time || 'TBD'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {load.delivery_address || ''} {load.delivery_city || ''}, {load.delivery_state || ''} {load.delivery_zip || ''}
            </Text>
          </View>
          {load.delivery_contact && (
            <View style={styles.row}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{load.delivery_contact} - {load.delivery_phone || 'N/A'}</Text>
            </View>
          )}
        </View>

        {/* Rate Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RATE AGREEMENT</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Miles:</Text>
            <Text style={styles.value}>{load.miles || 0} miles</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Line Haul Rate:</Text>
            <Text style={[styles.value, styles.important]}>
              ${load.rate?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {load.miles && load.rate && (
            <View style={styles.row}>
              <Text style={styles.label}>Rate Per Mile:</Text>
              <Text style={styles.value}>
                ${(load.rate / load.miles).toFixed(2)}/mile
              </Text>
            </View>
          )}
        </View>

        {/* Terms & Conditions */}
        <View style={styles.terms}>
          <Text style={{ fontWeight: 700, marginBottom: 5 }}>TERMS & CONDITIONS</Text>
          <Text>1. Carrier agrees to transport the shipment described above.</Text>
          <Text>2. Payment terms: Net 30 days upon receipt of signed BOL and POD.</Text>
          <Text>3. Carrier must maintain cargo and liability insurance.</Text>
          <Text>4. This rate confirmation supersedes all previous quotes.</Text>
          <Text>5. Carrier agrees not to re-broker this load.</Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>Carrier Signature & Date</Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text>Broker Signature & Date</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by LoadVoice • {currentDate} • Page 1 of 1
        </Text>
      </Page>
    </Document>
  )
}

// Export a component that generates the download link
export const RateConfirmationDownload: React.FC<{
  load: LoadData
  brokerInfo: any
  fileName?: string
}> = ({ load, brokerInfo, fileName }) => {
  const defaultFileName = `rate-confirmation-${load.load_number || Date.now()}.pdf`

  return (
    <PDFDownloadLink
      document={<RateConfirmationDocument load={load} brokerInfo={brokerInfo} />}
      fileName={fileName || defaultFileName}
    >
      {({ blob, url, loading, error }) =>
        loading ? 'Generating PDF...' : 'Download Rate Confirmation'
      }
    </PDFDownloadLink>
  )
}